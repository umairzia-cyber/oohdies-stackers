// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockRevenueToken
 * @notice TESTNET ONLY - NOT FOR PRODUCTION.
 * @dev Mock protocol revenue token (e.g. REV / FEE) used to simulate user economic activities.
 */
contract MockRevenueToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock Protocol Revenue", "REV") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
