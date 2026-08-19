# OOHDIES STACKERS — ERC-6551 TOKEN BOUND ACCOUNT PRODUCTION POLICY

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** OohdiesAccount & ERC-6551 Integration Specification  
**Date:** 2026-08-19  

---

## 1. ERC-6551 Token Bound Account (TBA) Architecture

The Oohdies protocol utilizes standard **ERC-6551: Non-Fungible Token Bound Accounts** to turn every Oohdies NFT into a sovereign smart wallet.

```
+─────────────────────────────────────────────────────────────────────────────────+
|                      ERC-6551 ARCHITECTURE & LIFECYCLE                          |
+─────────────────────────────────────────────────────────────────────────────────+

 [OohdiesNFT #TokenId] (Root Identity Asset)
          │
          │ (Deterministic CREATE2 Derivation via Canonical Registry)
          ▼
 [ERC-6551 Token Bound Account (OohdiesAccount.sol)]
  ├── Address: 0xB870... (Derived offline or on-chain)
  ├── Owner: Live query to OohdiesNFT.ownerOf(tokenId)
  ├── Custody: Holds ETH, ERC-20 Reward Stocks, ERC-721, ERC-1155
  └── Control: Executable strictly by current NFT owner (CALL only)
```

---

## 2. Technical Invariants & Operational Policy

### 2.1 Canonical Registry & Implementation Deployment
- **Canonical Registry Address**: `0x000000006551c19487814612e58FE06813775758` across all EVM-compatible chains.
- **Implementation Strategy**: `OohdiesAccount.sol` is deployed once per chain. Account instances are lightweight ERC-1167 minimal proxies pointing to this master implementation.
- **Deterministic Derivation (`predictAccount`)**: The account address for any `tokenId` is computed offline via CREATE2 without deploying the contract:
  $$\text{TBA} = \text{keccak256}(0xff ++ \text{registry} ++ \text{salt} ++ \text{keccak256}(\text{ERC1167\_InitCode}))$$
- **Pre-Deployment Asset Reception**: An account can safely receive ETH, ERC-20, and NFTs **before** its contract is deployed on-chain. Deploying the account is permissionless, idempotent, and only required when the owner wishes to move assets out.

### 2.2 Execution Permissions & Danger Mitigation
- **Strict CALL-Only Policy (`operation == 0`)**: The `execute()` function strictly supports standard external `CALL`.
- **Rejection of Dangerous Operations**:
  - `operation == 1` (`DELEGATECALL`): **STRICTLY REVERTED** (`InvalidOperation(1)`). Prevents malicious targets from rewriting account storage or hijacking ownership logic.
  - `operation == 2` (`CREATE`) & `operation == 3` (`CREATE2`): **STRICTLY REVERTED**.
- **State Monotonicity**: Every successful `execute()` increments `_state`, invalidating pending off-chain signatures.

### 2.3 Asset Ingestion & Interface Support
- **Native Value**: Supports receiving native ETH via `receive() external payable`.
- **ERC-20 Tokens**: Automatically receives and holds all standard ERC-20 tokens.
- **ERC-721 & ERC-1155**: Implements `IERC721Receiver` (`onERC721Received`) and `IERC1155Receiver` (`onERC1155Received`, `onERC1155BatchReceived`).
- **ERC-1271 Signature Validation**: Implements `isValidSignature(bytes32, bytes)` and `isValidSigner(address, bytes)` returning the magic value `0x523e3260` if and only if the signer is the live owner of the underlying NFT.

### 2.4 Ownership-Cycle Prevention Guard
To prevent irrecoverable "black hole" state locks where an NFT is transferred into its own Token Bound Account:
1. **`onERC721Received` Guard**: If `tokenContract == msg.sender` and `tokenId == receivedTokenId`, the account **reverts immediately** with `OwnershipCycle()`.
2. **Backstop Guard in `_isValidSigner`**: If an NFT was transferred via raw `transferFrom` (bypassing receiver hooks), the account detects `currentOwner == address(this)` and **reverts with `OwnershipCycle()`** on any subsequent `execute()` attempt.

### 2.5 Transfer Semantics & Asset Follow-Through
- **Dynamic Ownership**: The account stores **no owner variable**. It queries `IERC721(tokenContract).ownerOf(tokenId)` live on every call.
- **The Core Value Guarantee**: When an Oohdies NFT is sold or transferred, all tokens and assets held in its Token Bound Account **instantly and irreversibly transfer control to the new NFT owner**.
- **Seller Lockout**: The previous owner's authorization terminates immediately with zero lingering permissions.

---

## 3. User Transparency & Disclosure Requirements

> [!IMPORTANT]
> **Mandatory User Disclosures**:
> 1. **"Assets Follow the NFT"**: The frontend and marketplace listings must clearly disclose that assets residing in the TBA transfer with the NFT.
> 2. **Pre-Transfer Sweeps**: If a seller does not intend to transfer accrued TBA rewards, they must execute withdrawal transactions **before** listing or transferring the NFT.
> 3. **Non-Custodial Nature**: Protocol admins, creators, and operators have **zero backdoor access** to recover, freeze, or extract assets from a user's Token Bound Account.
