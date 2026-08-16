// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev ERC-165 identifier: 0x6faff5f1
interface IERC6551Account {
    receive() external payable;

    /// @dev Constant for the life of the account.
    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId);

    /// @dev Should change on every state change.
    function state() external view returns (uint256);

    /// @dev Returns 0x523e3260 for a valid signer.
    function isValidSigner(address signer, bytes calldata context) external view returns (bytes4 magicValue);
}
