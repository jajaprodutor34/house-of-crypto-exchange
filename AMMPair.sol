// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AMMPair {
    address public token0;
    address public token1;
    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address to);

    constructor() {}

    function initialize(address _token0, address _token1) external {
        require(token0 == address(0) && token1 == address(0), "ALREADY_INITIALIZED");
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
        require(uint(balance0) * uint(balance1) >= uint(reserve0) * uint(reserve1), "K_CHECK_FAILED");
        _update(balance0, balance1);
        emit Swap(msg.sender, balance0 - reserve0, balance1 - reserve1, amount0Out, amount1Out, to);
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}
