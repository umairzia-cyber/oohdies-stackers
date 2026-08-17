// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev ERC-165 identifier: 0x51945447
interface IERC6551Executable {
    /// @dev operation: 0 = CALL, 1 = DELEGATECALL, 2 = CREATE, 3 = CREATE2. An account may
    ///      restrict which of these it accepts.
    function execute(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        payable
        returns (bytes memory);
}
