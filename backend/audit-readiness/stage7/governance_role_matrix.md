# OOHDIES STACKERS — GOVERNANCE & PRIVILEGED ROLE MATRIX

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Role-Based Access Control (RBAC) Specification  
**Date:** 2026-08-19  

---

## 1. Protocol Privileged Roles Hierarchy

The production protocol architecture establishes a 3-tier governance model:

```
+─────────────────────────────────────────────────────────────────────────────────+
|                           GOVERNANCE ROLE HIERARCHY                             |
+─────────────────────────────────────────────────────────────────────────────────+

 1. [DAO / Governance Multisig + Timelock] (Tier 1: High Privilege)
    ├── Parameter Updates (activationCost, requiredPicks, collectionQMultiplier)
    ├── System Wiring (setEarningEngine, setActivationController, setRewardVault)
    ├── Asset Whitelisting (registerRewardAsset)
    └── Role Management (setFunder, transferOwnership)

 2. [Operational Funder Role / Automated Treasury Bot] (Tier 2: Routine Ops)
    ├── Emission Scheduling (EarningEngine.fundReward)
    └── Physical Reward Ingestion (RewardVault.depositReward)

 3. [Emergency Security Council] (Tier 3: Fast-Response Circuit Breaker)
    ├── Emergency Pause (ActivationController.pause, EarningEngine.pause, RewardVault.pause)
    └── Emergency Unpause (Post-incident recovery)
```

---

## 2. Contract-by-Contract Access Control Matrix

| Contract | Function Name | Permitted Caller | Guard Modifier / Check | Risk Severity |
| :--- | :--- | :--- | :--- | :--- |
| **`BananaToken`** | `mint(address, uint256)` | Owner (Multisig) | `onlyOwner` | HIGH |
| **`BananaToken`** | `burn(uint256)` | Any Token Holder | None (Self-burn only) | LOW |
| **`OohdiesNFT`** | `mintBatch(address, uint256)` | Owner (Multisig) | `onlyOwner`, `whenNotPaused` | HIGH |
| **`OohdiesNFT`** | `setMintPrice(uint256)` | Owner (Multisig) | `onlyOwner` | MEDIUM |
| **`OohdiesNFT`** | `setEarningEngine(address)` | Owner (Multisig) | `onlyOwner` | CRITICAL |
| **`OohdiesNFT`** | `setActivationController(address)`| Owner (Multisig) | `onlyOwner` | CRITICAL |
| **`OohdiesNFT`** | `pause() / unpause()` | Owner / Security Council | `onlyOwner` | MEDIUM |
| **`OohdiesNFT`** | `withdraw()` | Owner (Multisig) | `onlyOwner`, `nonReentrant` | HIGH |
| **`ActivationController`** | `setActivationCost(uint256)` | Owner (Multisig) | `onlyOwner` | HIGH |
| **`ActivationController`** | `setEarningEngine(address)` | Owner (Multisig) | `onlyOwner` | CRITICAL |
| **`ActivationController`** | `setRequiredPicks(uint256)` | Owner (Multisig) | `onlyOwner` | HIGH |
| **`ActivationController`** | `pause() / unpause()` | Owner / Security Council | `onlyOwner` | MEDIUM |
| **`ActivationController`** | `activate(uint256, address[])` | NFT Owner Only | `msg.sender == nft.ownerOf(id)` | LOW (User Action) |
| **`ActivationController`** | `deactivateOnTransfer(uint256)`| OohdiesNFT Contract Only | `msg.sender == address(nft)` | HIGH |
| **`EarningEngine`** | `registerRewardAsset(address)` | Owner (Multisig) | `onlyOwner` | HIGH |
| **`EarningEngine`** | `setFunder(address, bool)` | Owner (Multisig) | `onlyOwner` | HIGH |
| **`EarningEngine`** | `setRewardVault(address)` | Owner (Multisig) | `onlyOwner` | CRITICAL |
| **`EarningEngine`** | `setCollectionQ(address, uint256)`| Owner (Multisig) | `onlyOwner` | MEDIUM |
| **`EarningEngine`** | `fundReward(address, uint, uint)`| Registered Funders | `isFunder[msg.sender] == true` | HIGH |
| **`EarningEngine`** | `onNftActivation(...)` | ActivationController Only | `msg.sender == address(ctrl)` | HIGH |
| **`EarningEngine`** | `onNftDeactivation(...)` | ActivationController Only | `msg.sender == address(ctrl)` | HIGH |
| **`EarningEngine`** | `onNftTransfer(...)` | OohdiesNFT Contract Only | `msg.sender == address(nft)` | HIGH |
| **`EarningEngine`** | `deductClaimableReward(...)` | RewardVault Contract Only | `msg.sender == address(vault)` | CRITICAL |
| **`EarningEngine`** | `releaseIfInactive(uint256)` | Permissionless | `!activation.isActivated(id)` | LOW (Self-Repair) |
| **`RewardVault`** | `depositReward(address, uint256)`| Permissionless | `whenNotPaused`, `nonReentrant` | LOW |
| **`RewardVault`** | `claimReward(uint256, address)` | Permissionless (Sends to TBA)| `whenNotPaused`, `nonReentrant` | LOW |
| **`RewardVault`** | `pause() / unpause()` | Owner / Security Council | `onlyOwner` | MEDIUM |
| **`OohdiesAccount`** | `execute(...)` | Live NFT Owner Only | `_isValidSigner(msg.sender)` | CRITICAL (User Only) |

---

## 3. Separation of Duties & Operational Security Policies

1. **No Single EOA Admin**: Production contracts must transfer `Ownable` to a multi-signature contract (`Gnosis Safe`) behind a `TimelockController` before mainnet public launch.
2. **Dedicated Funder Account**: The automated funding bot/script is assigned the `isFunder` role in `EarningEngine` and has zero ownership or administrative powers.
3. **Emergency Pause Authority**: A dedicated fast-response Security Council multi-sig can invoke `pause()` without waiting for timelock delays to contain active threats.
