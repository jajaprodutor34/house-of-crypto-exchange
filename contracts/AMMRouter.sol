// Sources flattened with hardhat v2.26.3 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v4.8.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.9;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}


// File contracts/AMMFactory.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.9;

contract AMMFactory {
    struct Pool {
        address token0;
        address token1;
        address pairAddress; // optional placeholder if you later deploy pair contracts
        uint256 creationTime;
        uint256 stableDeposited; // amount of REFERENCE_STABLE deposited (wei)
        bool visible;
    }

    mapping(address => mapping(address => address)) public getPair; // token0->token1 => pairAddress
    Pool[] public pools;
    mapping(address => uint256) public poolIndexByPair; // pairAddress -> index+1 (0 = none)

    // visibility / business rules
    address public immutable REFERENCE_STABLE; // e.g. DAI
    address public immutable FOUNDER_TOKEN; // your exchange native token (HOCE)
    uint256 public constant MIN_STABLE = 200 * 10**18; // 200 units (assumes 18 decimals)
    uint256 public constant GRACE_PERIOD = 48 hours;

    event PairCreated(address indexed token0, address indexed token1, address pairAddress, uint256 creationTime);
    event StableDeposited(address indexed pairAddress, uint256 amount, uint256 totalStable);
    event VisibilityUpdated(address indexed pairAddress, bool visible, uint256 stableAmount);
    event PoolHidden(address indexed pairAddress, uint256 stableAmount);
    event PoolShown(address indexed pairAddress, uint256 stableAmount);

    constructor(address _referenceStable, address _founderToken) {
        require(_referenceStable != address(0), "ZERO_REFERENCE");
        require(_founderToken != address(0), "ZERO_FOUNDER");
        REFERENCE_STABLE = _referenceStable;
        FOUNDER_TOKEN = _founderToken;
    }

    // Create pair (no mandatory stable deposit; user may pass stableAmount and approve Factory first)
    // tokenA and tokenB must be non-zero and distinct
    function createPair(address tokenA, address tokenB, uint256 stableAmount) external returns (address pairAddress) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        // pairAddress is a virtual identifier — you can later deploy pair contracts and set this address.
        pairAddress = address(uint160(uint256(keccak256(abi.encodePacked(block.timestamp, token0, token1, msg.sender)))));

        getPair[token0][token1] = pairAddress;
        getPair[token1][token0] = pairAddress;

        Pool memory p;
        p.token0 = token0;
        p.token1 = token1;
        p.pairAddress = pairAddress;
        p.creationTime = block.timestamp;
        p.stableDeposited = 0;
        p.visible = true; // visible initially — grace rule enforced later

        pools.push(p);
        poolIndexByPair[pairAddress] = pools.length; // store index+1

        // If user supplied stableAmount > 0, transfer REFERENCE_STABLE from caller
        if (stableAmount > 0) {
            _depositStable(pairAddress, stableAmount);
        }

        // If pair uses founder token or reference stable token itself, make permanent visible
        if (_isException(token0) || _isException(token1)) {
            _setVisibility(pairAddress, true);
        } else {
            // apply immediate visibility logic based on stableDeposited
            if (stableAmount >= MIN_STABLE) {
                _setVisibility(pairAddress, true);
            } else {
                // remains visible for grace period (we mark visible now; after 48h external checker must hide)
                _setVisibility(pairAddress, true);
            }
        }

        emit PairCreated(token0, token1, pairAddress, block.timestamp);
    }

    // deposit REFERENCE_STABLE to a pair (user must approve the factory to transfer tokens)
    function depositStableToPair(address pairAddress, uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        uint256 idx = poolIndexByPair[pairAddress];
        require(idx != 0, "PAIR_NOT_FOUND");
        _depositStable(pairAddress, amount);
    }

    // internal stable deposit handler
    function _depositStable(address pairAddress, uint256 amount) internal {
        IERC20 stable = IERC20(REFERENCE_STABLE);
        require(stable.transferFrom(msg.sender, address(this), amount), "STABLE_TRANSFER_FAIL");

        uint256 idx = poolIndexByPair[pairAddress];
        require(idx != 0, "PAIR_NOT_FOUND");
        Pool storage p = pools[idx - 1];
        p.stableDeposited += amount;

        emit StableDeposited(pairAddress, amount, p.stableDeposited);

        // If after deposit the stable meets threshold, make visible and emit
        if (p.stableDeposited >= MIN_STABLE) {
            _setVisibility(pairAddress, true);
            emit PoolShown(pairAddress, p.stableDeposited);
        }
    }

    // Add a public function to allow checking and enforcing hiding after grace period
    // This is meant to be called by anyone (off-chain cron or UI) to enforce hide/show rules
    function enforceVisibilityForPair(address pairAddress) public {
        uint256 idx = poolIndexByPair[pairAddress];
        require(idx != 0, "PAIR_NOT_FOUND");
        Pool storage p = pools[idx - 1];

        // exceptions always visible
        if (_isException(p.token0) || _isException(p.token1) || _isException(p.pairAddress)) {
            if (!p.visible) _setVisibility(pairAddress, true);
            return;
        }

        // if stableDeposited >= MIN -> visible
        if (p.stableDeposited >= MIN_STABLE) {
            if (!p.visible) {
                _setVisibility(pairAddress, true);
                emit PoolShown(pairAddress, p.stableDeposited);
            }
            return;
        }

        // if still in grace period -> keep visible
        if (block.timestamp <= p.creationTime + GRACE_PERIOD) {
            if (!p.visible) _setVisibility(pairAddress, true);
            return;
        }

        // else hide
        if (p.visible) {
            p.visible = false;
            emit PoolHidden(pairAddress, p.stableDeposited);
            emit VisibilityUpdated(pairAddress, false, p.stableDeposited);
        }
    }

    // Public getter for pools length
    function allPoolsLength() external view returns (uint256) {
        return pools.length;
    }

    // get pool by index
    function getPool(uint256 index) external view returns (
        address token0,
        address token1,
        address pairAddress,
        uint256 creationTime,
        uint256 stableDeposited,
        bool visible
    ) {
        require(index < pools.length, "INDEX_OUT_OF_RANGE");
        Pool storage p = pools[index];
        return (p.token0, p.token1, p.pairAddress, p.creationTime, p.stableDeposited, p.visible);
    }

    // helper internal to set visibility and emit event
    function _setVisibility(address pairAddress, bool vis) internal {
        uint256 idx = poolIndexByPair[pairAddress];
        require(idx != 0, "PAIR_NOT_FOUND");
        Pool storage p = pools[idx - 1];
        p.visible = vis;
        emit VisibilityUpdated(pairAddress, vis, p.stableDeposited);
    }

    // helper to mark exception tokens (founder or reference stable)
    function _isException(address token) internal view returns (bool) {
        if (token == address(0)) return false;
        if (token == FOUNDER_TOKEN) return true;
        if (token == REFERENCE_STABLE) return true;
        return false;
    }

    // Allow ownerless withdrawal of stable tokens by contract operator is not implemented
    // For production you'd implement ownership and secure treasury behavior.
}


// File contracts/AMMPair.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.9;

contract AMMPair {
address public token0;
address public token1;
uint112 private reserve0;
uint112 private reserve1;
uint32 private blockTimestampLast;


event Mint(address indexed sender, uint amount0, uint amount1);
event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address to);


constructor() {}


function initialize(address _token0, address _token1) external {
require(token0 == address(0) && token1 == address(0), "ALREADY");
token0 = _token0;
token1 = _token1;
}


function _update(uint balance0, uint balance1) private {
reserve0 = uint112(balance0);
reserve1 = uint112(balance1);
blockTimestampLast = uint32(block.timestamp % 2**32);
}


function addLiquidity(uint amount0, uint amount1) external {
require(amount0 > 0 && amount1 > 0, "ZERO_AMOUNTS");
IERC20(token0).transferFrom(msg.sender, address(this), amount0);
IERC20(token1).transferFrom(msg.sender, address(this), amount1);


uint balance0 = IERC20(token0).balanceOf(address(this));
uint balance1 = IERC20(token1).balanceOf(address(this));


_update(balance0, balance1);
emit Mint(msg.sender, amount0, amount1);
}


function swap(uint amount0Out, uint amount1Out, address to) external {
require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT");
if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);


uint balance0 = IERC20(token0).balanceOf(address(this));
uint balance1 = IERC20(token1).balanceOf(address(this));


require(uint(balance0) * uint(balance1) >= uint(reserve0) * uint(reserve1), "K");
_update(balance0, balance1);
emit Swap(msg.sender, balance0 - reserve0, balance1 - reserve1, amount0Out, amount1Out, to);
}


function getReserves() external view returns (uint112, uint112, uint32) {
return (reserve0, reserve1, blockTimestampLast);
}
}


// File contracts/AMMRouter.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.9;



contract AMMRouter {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB
    ) external {
        address pair = AMMFactory(factory).getPair(tokenA, tokenB);

        // Cria o par se ele não existir (com stableAmount = 0)
        if (pair == address(0)) {
            pair = AMMFactory(factory).createPair(tokenA, tokenB, 0);
        }

        // Transfere tokens do usuário para o par
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);

        // Adiciona liquidez no par
        AMMPair(pair).addLiquidity(amountA, amountB);

        // 🔹 Atualiza visibilidade de acordo com as regras do Factory
        AMMFactory(factory).enforceVisibilityForPair(pair);
    }

    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint amountIn,
        uint minOut,
        address to
    ) external {
        address pair = AMMFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "NO_PAIR");

        IERC20(tokenIn).transferFrom(msg.sender, pair, amountIn);

        (uint112 r0, uint112 r1,) = AMMPair(pair).getReserves();
        (address token0,) = tokenIn < tokenOut ? (tokenIn, tokenOut) : (tokenOut, tokenIn);

        uint amountOut;
        if (token0 == tokenIn) {
            uint newR0 = uint(r0) + amountIn;
            uint newR1 = (uint(r0) * uint(r1)) / newR0;
            amountOut = uint(r1) - newR1;
        } else {
            uint newR1 = uint(r1) + amountIn;
            uint newR0 = (uint(r0) * uint(r1)) / newR1;
            amountOut = uint(r0) - newR0;
        }

        require(amountOut >= minOut, "INSUFFICIENT_OUTPUT_AMOUNT");

        // Executa o swap
        AMMPair(pair).swap(
            token0 == tokenIn ? 0 : amountOut,
            token0 == tokenIn ? amountOut : 0,
            to
        );
    }
}
