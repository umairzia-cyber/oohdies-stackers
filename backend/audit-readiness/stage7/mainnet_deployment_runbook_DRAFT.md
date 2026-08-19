# OOHDIES STACKERS — MAINNET DEPLOYMENT RUNBOOK (DRAFT / NON-EXECUTABLE)

**Document Version:** 1.0.0 (DRAFT)  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Mainnet Launch Procedure & Role Ceremony Guide  
**Date:** 2026-08-19  

> [!WARNING]
> **DRAFT / NON-EXECUTABLE SPECIFICATION**:
> This runbook is an operational design document for audit readiness and launch planning.
> It must **NOT** be executed during Stage 7. No mainnet deployment is authorized at this time.

---

## 1. Phase 0: Pre-Deployment Prerequisites & Code Freeze

- [ ] **Final Code Freeze**: Git commit hash tagged and locked; zero uncommitted diffs across backend and frontend repositories.
- [ ] **Independent Security Audit**: Full commercial smart contract audit completed with all High/Critical findings resolved.
- [ ] **Deterministic Compiler Verification**: Hardhat environment verified on `solc 0.8.24` (`cancun` EVM, optimizer settings verified).
- [ ] **Governance Infrastructure**: Multisig Safe (e.g. 3-of-5) and OpenZeppelin `TimelockController` deployed and verified on target mainnet.
- [ ] **Gas & Seed Funding**: Deployer and multi-sig accounts funded with native gas tokens on the target chain.

---

## 2. Phase 1: Authoritative Contract Deployment Sequence

Deploy contracts in strict chronological order to avoid circular dependencies:

```
Step 1: Deploy BananaToken(deployerAddress)
Step 2: Deploy OohdiesNFT(deployerAddress)
Step 3: Deploy ActivationController(nftAddress, bananaAddress, deployerAddress, 100e18)
Step 4: Deploy EarningEngine(activationAddress, nftAddress, deployerAddress)
Step 5: Verify Canonical ERC-6551 Registry at 0x000000006551c19487814612e58FE06813775758
Step 6: Deploy OohdiesAccount.sol (Master Implementation)
Step 7: Deploy RewardVault(nftAddress, engineAddress, deployerAddress, registryAddress, accountImplAddress, salt)
```

---

## 3. Phase 2: Inter-Contract Wiring & Initialization Checklist

Execute the following configuration transactions sequentially:

1. **`ActivationController.setEarningEngine(engineAddress)`**
   - Verify event `EarningEngineUpdated(address(0), engineAddress)`
2. **`EarningEngine.setRewardVault(vaultAddress)`**
   - Verify event `RewardVaultUpdated(address(0), vaultAddress)`
3. **`OohdiesNFT.setEarningEngine(engineAddress)`**
   - Verify event `EarningEngineUpdated(address(0), engineAddress)`
4. **`OohdiesNFT.setActivationController(activationAddress)`**
   - Verify event `ActivationControllerUpdated(address(0), activationAddress)`
5. **`EarningEngine.registerRewardAsset(assetAddress)`**
   - Repeat for all approved reward assets (e.g. Approved list).
6. **`EarningEngine.setCollectionQ(collectionQAddress, 20000)`** (If applicable).

---

## 4. Phase 3: Post-Deployment Verification & Read-Only Sanity Checks

Run automated read-only assertion scripts against the live deployed addresses:
- [ ] `nft.earningEngine() == engine.address`
- [ ] `nft.activationController() == activation.address`
- [ ] `activation.earningEngine() == engine.address`
- [ ] `activation.oohdiesNFT() == nft.address`
- [ ] `activation.bananaToken() == banana.address`
- [ ] `engine.rewardVault() == vault.address`
- [ ] `vault.earningEngine() == engine.address`
- [ ] `vault.oohdiesNFT() == nft.address`
- [ ] `vault.accountImplementation() == accountImpl.address`
- [ ] `vault.registry() == canonicalRegistryAddress`

---

## 5. Phase 4: Role Transfer & Governance Ceremony

1. **Grant Funder Role**:
   - `EarningEngine.setFunder(operationalTreasuryBotAddress, true)`
2. **Transfer Contract Ownership to Timelock / Multisig**:
   - `BananaToken.transferOwnership(timelockAddress)`
   - `OohdiesNFT.transferOwnership(timelockAddress)`
   - `ActivationController.transferOwnership(timelockAddress)`
   - `EarningEngine.transferOwnership(timelockAddress)`
   - `RewardVault.transferOwnership(timelockAddress)`
3. **Accept Ownership & Revoke Deployer**:
   - Timelock accepts ownership.
   - Verify `owner() == timelockAddress` on all 5 authoritative contracts.
   - Deployer EOA balance drained and retired.

---

## 6. Phase 5: Staged Value Limits & Launch Monitoring

- [ ] **Stage A (Soft Launch / Smoke Test)**: Initial capped minting and small test reward emission to verify live TBA distribution.
- [ ] **Stage B (Monitoring Enablement)**: OpenZeppelin Defender / Tenderly sentinel alerts verified active.
- [ ] **Stage C (Public Availability)**: Public frontend updated with verified contract addresses and telemetry dashboards enabled.
