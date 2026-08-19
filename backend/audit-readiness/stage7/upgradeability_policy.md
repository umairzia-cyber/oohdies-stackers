# OOHDIES STACKERS — UPGRADEABILITY & IMMUTABILITY POLICY

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Upgradeability Strategy & Immutability Specification  
**Date:** 2026-08-19  

---

## 1. Architectural Philosophy: Modular Immutability

The Oohdies Stackers protocol adopts a **Modular Immutability with Governed Inter-Contract Wiring** architecture rather than monolithic proxy upgradeability (such as UUPS or Transparent Upgradeable Proxies).

### Why Modular Immutability?
1. **Elimination of Proxy Storage Collision Risks**: Transparent/UUPS proxies introduce significant attack surfaces related to uninitialized implementations, storage layout clashes across compiler versions, and delegatecall hijacking.
2. **Deterministic Token Bound Accounts**: ERC-6551 Token Bound Accounts require an immutable, bytecode-stable implementation address to ensure account addresses remain stable across chains.
3. **Auditor Simplicity & Provable Security**: Immutable contracts with explicit parameter setters provide unambiguous verification bounds for external security firms.

---

## 2. Contract-by-Contract Upgradeability Design

| Contract | Architecture Pattern | Upgrade / Migration Mechanism | Risk & Mitigation |
| :--- | :--- | :--- | :--- |
| **`BananaToken`** | **Immutable ERC-20** | Non-upgradeable standard ERC-20. | Zero proxy risk. Standard OpenZeppelin ERC20. |
| **`OohdiesNFT`** | **Immutable Core ERC-721** | Non-upgradeable. External module pointers (`earningEngine`, `activationController`) can be re-pointed via governance. | Changing wiring requires timelock review. |
| **`ActivationController`** | **Modular Replaceable** | New version can be deployed; `OohdiesNFT.setActivationController()` updates pointer. | State migration (active picks) required if replaced. |
| **`EarningEngine`** | **Modular Replaceable** | New version can be deployed; `ActivationController.setEarningEngine()` & `NFT.setEarningEngine()` update pointers. | Accrual snapshot migration required if replaced. |
| **`RewardVault`** | **Custodial Vault** | Non-upgradeable custodial contract. `EarningEngine.setRewardVault()` updates pointer. | Vault holds physical tokens; migration requires draining only via claims. |
| **`OohdiesAccount`** | **ERC-1167 Minimal Proxy** | Immutable master implementation. Upgrading requires deploying a new implementation and updating `RewardVault.createAccount` pointer. | Existing TBAs retain previous implementation unless migrated by owner. |
| **`ERC6551Registry`** | **Canonical Immutability** | Universal canonical registry at `0x000000006551c19487814612e58FE06813775758`. | Standardized across all EVM networks. |

---

## 3. Modular Migration & Governance Safeguards

### 3.1 Migration Procedure
If an updated version of `EarningEngine` or `ActivationController` is deployed:
1. **Audited Source Code**: The replacement contract must undergo full third-party independent security audit.
2. **Timelock Staging**: The governance pointer update transaction must be queued in `TimelockController` for at least 48 hours.
3. **Pause & Accrual Snapshot**: Active emissions are completed or paused during the migration block to preserve index parity.
4. **Pointer Redirection**: The owner invokes `setEarningEngine(newAddress)` and `setActivationController(newAddress)`.

### 3.2 Key Compromise Response
If an administrative key is suspected of being compromised:
1. **Immediate Pause**: The Security Council invokes `pause()` across all contracts (no timelock required).
2. **Ownership Migration**: The remaining non-compromised threshold of signers executes an emergency key rotation.
3. **Post-Incident Review**: System integrity is reconciled and verified on-chain before unpausing.
