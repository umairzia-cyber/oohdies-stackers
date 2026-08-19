// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * TESTNET ONLY — SECURITY TEST HARNESS — NOT FOR PRODUCTION
 * 
 * Malicious ERC-20 and receiver contracts for Stage 6 adversarial security testing.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ============================================================================
// 1. REENTRANT ERC-20 — attempts reentrancy on transfer
// ============================================================================
contract ReentrantERC20 is ERC20 {
    address public target;
    bytes public attackData;
    bool public armed;

    constructor() ERC20("ReentrantToken", "REENT") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address _target, bytes calldata _data) external {
        target = _target;
        attackData = _data;
        armed = true;
    }

    function disarm() external {
        armed = false;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (armed && target != address(0) && from != address(0) && to != address(0)) {
            armed = false; // prevent infinite loop
            (bool success,) = target.call(attackData);
            // Swallow failure — we just want to see if reentrancy succeeds
            success;
        }
    }
}

// ============================================================================
// 2. FALSE-RETURN ERC-20 — returns false instead of reverting
// ============================================================================
contract FalseReturnERC20 {
    string public name = "FalseReturn";
    string public symbol = "FALSE";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor() {
        totalSupply = 1_000_000 * 1e18;
        balanceOf[msg.sender] = totalSupply;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false; // Always returns false
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false; // Always returns false
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

// ============================================================================
// 3. FEE-ON-TRANSFER ERC-20 — deducts a fee on every transfer
// ============================================================================
contract FeeOnTransferERC20 is ERC20 {
    uint256 public constant FEE_BPS = 1000; // 10% fee
    address public feeRecipient;

    constructor() ERC20("FeeToken", "FEE") {
        feeRecipient = msg.sender;
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && to != feeRecipient) {
            uint256 fee = (value * FEE_BPS) / 10000;
            super._update(from, feeRecipient, fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

// ============================================================================
// 4. REVERTING ERC-20 — always reverts on transfer/transferFrom
// ============================================================================
contract RevertingERC20 is ERC20 {
    bool public shouldRevert = true;

    constructor() ERC20("RevertToken", "REVERT") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (shouldRevert && from != address(0) && to != address(0)) {
            revert("RevertingERC20: transfer blocked");
        }
        super._update(from, to, value);
    }
}

// ============================================================================
// 5. MALICIOUS RECEIVER — attempts reentrancy when receiving ERC-721/1155
// ============================================================================
contract MaliciousReceiver {
    address public target;
    bytes public attackData;
    bool public armed;
    uint256 public attackCount;

    function arm(address _target, bytes calldata _data) external {
        target = _target;
        attackData = _data;
        armed = true;
    }

    function disarm() external {
        armed = false;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (armed && target != address(0)) {
            armed = false;
            attackCount++;
            (bool success,) = target.call(attackData);
            success;
        }
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
        if (armed && target != address(0)) {
            armed = false;
            attackCount++;
            (bool success,) = target.call(attackData);
            success;
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}

// ============================================================================
// 6. MALICIOUS TBA TARGET — attempts reenter TBA.execute during a call
// ============================================================================
contract MaliciousTBATarget {
    address public tbaAddress;
    bool public armed;
    uint256 public attackAttempts;

    function arm(address _tba) external {
        tbaAddress = _tba;
        armed = true;
    }

    function disarm() external {
        armed = false;
    }

    // Called by TBA.execute — tries to reenter
    fallback() external payable {
        if (armed && tbaAddress != address(0)) {
            armed = false;
            attackAttempts++;
            // Try to reenter TBA.execute to steal funds
            bytes memory data = abi.encodeWithSignature(
                "execute(address,uint256,bytes,uint8)",
                address(this), // target
                0, // value
                "", // data
                0 // operation
            );
            (bool success,) = tbaAddress.call(data);
            success; // swallow result
        }
    }

    receive() external payable {}
}

// ============================================================================
// 7. ATTACK CALLER — unauthorized caller that tries privileged operations
// ============================================================================
contract AttackCaller {
    function tryCall(address target, bytes calldata data) external returns (bool success, bytes memory result) {
        (success, result) = target.call(data);
    }

    function tryActivate(
        address activationController,
        uint256 tokenId,
        address[] calldata assets
    ) external {
        (bool success,) = activationController.call(
            abi.encodeWithSignature("activate(uint256,address[])", tokenId, assets)
        );
        require(success, "AttackCaller: activation should have succeeded");
    }

    function tryExecuteTBA(
        address tba,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool success, bytes memory result) {
        (success, result) = tba.call(
            abi.encodeWithSignature("execute(address,uint256,bytes,uint8)", to, value, data, uint8(0))
        );
    }

    receive() external payable {}
}
