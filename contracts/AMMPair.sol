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
