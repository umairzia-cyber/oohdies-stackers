# OOHDIES STACKERS — PRODUCTION THREAT MODEL & SECURITY ARCHITECTURE

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** STRIDE / Threat Modeling Specification  
**Date:** 2026-08-19  

---

## 1. Threat Actors & Attacker Capabilities

```
+─────────────────────────────────────────────────────────────────────────────────+
|                           THREAT ACTORS TAXONOMY                                |
+─────────────────────────────────────────────────────────────────────────────────+

 1. External Arbitrary Attacker (EOA / Smart Contract)
    - Capabilities: Can call any public/external function; front-run mempool transactions;
      deploy arbitrary attacker contracts and flashloans.

 2. Malicious NFT Seller / Ex-Owner
    - Capabilities: Owns NFT prior to sale; attempts to drain TBA post-sale or front-run
      marketplace transactions to claim accrued rewards.

 3. Rogue / Compromised Funder Bot
    - Capabilities: Has `isFunder` permission in `EarningEngine`; attempts to fund zero-duration,
      overflowing, or invalid asset emission schedules.

 4. Malicious External Token / Reentrant Contract Target
    - Capabilities: Re-enters caller during transfer; returns false; takes fees on transfer;
      reverts on standard calls.
```

---

## 2. Protected Assets & Trust Boundaries

1. **User Token Bound Accounts (TBAs)**: Holds claimed rewards and arbitrary user assets. Must be controllable strictly by the current NFT owner.
2. **RewardVault Token Reserves**: Holds physical ERC-20 tokens backing pending claims. Must never be drained or redirected.
3. **EarningEngine Mathematical State**: Indices, active picker counts, and accrued reward balances. Must remain monotonically consistent.
4. **BANANA Token Supply Integrity**: 100 BANANA must be burned on every legitimate activation and never burned on failed attempts.

---

## 3. Threat Vector & Countermeasure Matrix

| Threat ID | Threat Scenario | STRIDE Category | Contract / Function | Implemented Countermeasure | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TH-01** | Attacker calls `execute()` on someone else's TBA | Elevation of Privilege | `OohdiesAccount.execute` | Checks `_isValidSigner(msg.sender)` against live `ownerOf(id)`. Reverts `NotAuthorized`. | ✅ VERIFIED (Stage 6) |
| **TH-02** | Ex-owner sells NFT then drains TBA | Spoofing / Tampering | `OohdiesAccount.execute` | `owner()` queries live `ownerOf(id)` on every call. Ex-owner loses access instantly. | ✅ VERIFIED (Stage 6) |
| **TH-03** | Attacker executes `DELEGATECALL` from TBA | Elevation of Privilege | `OohdiesAccount.execute` | Checks `operation == 0`. Any other operation reverts with `InvalidOperation`. | ✅ VERIFIED (Stage 6) |
| **TH-04** | User transfers NFT into its own TBA | Denial of Service | `OohdiesAccount.onERC721Received` | Hook detects `tokenContract == msg.sender && tokenId == receivedId` -> Reverts `OwnershipCycle`. | ✅ VERIFIED (Stage 6) |
| **TH-05** | Front-runner claims someone's reward | Tampering | `RewardVault.claimReward` | Destination is hardcoded to `accountOf(tokenId)`. Attacker cannot redirect funds. | ✅ VERIFIED (Stage 6) |
| **TH-06** | Claiming from underfunded vault causes state loss | Tampering | `RewardVault.claimReward` | Checks `vaultBalance >= claimableAmount`. Reverts atomically with `InsufficientVaultBalance`. | ✅ VERIFIED (Stage 6) |
| **TH-07** | Malicious token re-enters vault during deposit | Tampering / Reentrancy | `RewardVault.depositReward` | `nonReentrant` modifier from OpenZeppelin applied to all state-changing entrypoints. | ✅ VERIFIED (Stage 6) |
| **TH-08** | Non-standard ERC-20 (returns false / no bool) | Tampering | `EarningEngine` / `RewardVault` | Uses OpenZeppelin `SafeERC20` wrapper (`safeTransfer`, `safeTransferFrom`). | ✅ VERIFIED (Stage 6) |
| **TH-09** | Fee-on-transfer token dilutes vault reserves | Tampering | `RewardVault.depositReward` | Balance before/after delta calculation ensures only actual received tokens are credited. | ✅ VERIFIED (Stage 6) |
| **TH-10** | Funder inputs zero duration for infinite rate | Denial of Service | `EarningEngine.fundReward` | Checks `duration > 0`. Reverts `ZeroDurationNotAllowed`. | ✅ VERIFIED (Stage 6) |
| **TH-11** | User activates 0, 1, 2, 4 picks or duplicates | Tampering | `ActivationController.activate` | Strictly checks `assets.length == requiredPicks` and duplicate array uniqueness. | ✅ VERIFIED (Stage 6) |
| **TH-12** | NFT transfer leaves picks active on old owner | Elevation of Privilege | `OohdiesNFT.transferFrom` | Hook `deactivateOnTransfer` clears picks and notifies engine to redistribute stream. | ✅ VERIFIED (Stage 6) |
