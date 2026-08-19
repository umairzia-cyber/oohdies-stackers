# OOHDIES STACKERS — EXTERNAL SMART CONTRACT AUDIT SCOPE

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Third-Party Independent Security Audit Engagement  
**Date:** 2026-08-19  

---

## 1. Audit Target & Codebase Provenance

- **Repository**: Oohdies Stackers Backend Core
- **Target Git Commit**: `cf31049563cb96e0a7d99f0d92377736ca8b38d1`
- **Compiler Version**: Solidity `0.8.24` (EVM: `cancun`, optimizer: 200 runs)
- **Primary Framework**: Hardhat v3 with `@nomicfoundation/hardhat-toolbox-mocha-ethers`
- **OpenZeppelin Contracts**: `^5.6.1`

---

## 2. In-Scope Smart Contracts (Authoritative Protocol Core)

| Contract File | SLOC | Description / Criticality | Key Security Invariants |
| :--- | :--- | :--- | :--- |
| **`contracts/BananaToken.sol`** | ~40 | ERC-20 utility token | Burnable on activation; strictly owner-minted |
| **`contracts/OohdiesNFT.sol`** | ~140 | Core ERC-721 collection | Max supply 10,000; hooks to engine/activation on transfer |
| **`contracts/ActivationController.sol`** | ~168 | Activation & pick registry | 100 BANANA burn; exactly 3 distinct valid assets; transfer deactivation |
| **`contracts/EarningEngine.sol`** | ~546 | Mathematical reward ledger | Scaled emission index ($10^{36}$); stream division; zero-picker retention |
| **`contracts/RewardVault.sol`** | ~162 | Custodial reward token vault | Routing strictly to TBA; underfunded balance protection; reentrancy |
| **`contracts/OohdiesAccount.sol`** | ~129 | ERC-6551 TBA implementation | CALL only (`op == 0`); dynamic ownership query; `OwnershipCycle` guard |
| **`contracts/erc6551/ERC6551Registry.sol`** | ~140 | Account deployment registry | Canonical CREATE2 account factory matching ERC-6551 standard |
| **`contracts/erc6551/IERC6551Account.sol`** | ~25 | Standard interface | ERC-6551 account interface |
| **`contracts/erc6551/IERC6551Executable.sol`**| ~15 | Standard interface | ERC-6551 execution interface |
| **`contracts/erc6551/IERC6551Registry.sol`** | ~35 | Standard interface | ERC-6551 registry interface |
| **`contracts/mocks/MockCollectionQ.sol`** | ~30 | Staking multiplier hook | Holding doubles reward weight in `EarningEngine` |

---

## 3. Explicitly Out-of-Scope Components

Auditors must treat the following components as **TEST HARNESS ONLY**:
- `contracts/mocks/MockRevenueToken.sol` (Testnet token simulating protocol fees)
- `contracts/mocks/TestnetRevenueSimulator.sol` (Testnet revenue ingestion simulator)
- `contracts/mocks/TestnetPhysicalLiquidityPool.sol` (Testnet physical settlement mock swap pool)
- `contracts/mocks/MaliciousTokens.sol` (Hostile reentrancy/revert test harnesses)
- `contracts/mocks/MockRewardToken.sol` & `MockERC1155.sol` (Mock assets)
- `umair_crypto_website/` (Frontend web application)

---

## 4. Key Areas of Security Focus for Auditors

1. **Reward Accounting & Scaled Math**:
   - Verify index calculations in `EarningEngine.sol` under variable durations, multiple pickers joining/leaving, and varying token decimals (6, 8, 18).
   - Ensure zero possibility of arithmetic underflow, division by zero, or dust accumulation locking funds.
2. **ERC-6551 Dynamic Ownership Security**:
   - Validate that `OohdiesAccount` cannot be exploited to execute calls by previous owners after an NFT transfer.
   - Confirm that `operation == 1` (`DELEGATECALL`) is impossible to execute.
   - Verify that the `OwnershipCycle` guard completely prevents sending the NFT into its own TBA.
3. **Reward Vault Claim Isolation**:
   - Verify that `RewardVault.claimReward` cannot be manipulated to send tokens to any address other than `accountOf(tokenId)`.
   - Ensure that underfunded vault claims revert atomically without consuming user accrual state.
4. **Access Control & Hook Integrity**:
   - Confirm that `EarningEngine.onNftTransfer` and `ActivationController.deactivateOnTransfer` can only be invoked by `OohdiesNFT`.
   - Verify that `EarningEngine.deductClaimableReward` can only be invoked by `RewardVault`.

---

## 5. Auditor Reproduction & Test Suite Execution Instructions

Auditors can clone and reproduce the complete 532-test verification suite locally:

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Compile all contracts
npx hardhat compile

# 3. Run full test suite (532 tests, ~1 minute)
npx hardhat test

# 4. Run Stage 6 dedicated adversarial security & fuzz suite (97 tests)
npx hardhat test test/Stage6Security.test.js
```
