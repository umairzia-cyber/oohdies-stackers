# OOHDIES STACKERS — STAGE 7 PRODUCTION ARCHITECTURE SPECIFICATION

**Document Version:** 1.0.0 (FINAL)  
**Audit Stage:** Stage 7 — Production Architecture & External Audit Readiness  
**Target Codebase:** Oohdies Stackers Backend Core  
**Git Baseline Commit:** `cf31049563cb96e0a7d99f0d92377736ca8b38d1`  
**Date:** 2026-08-19  

---

## 1. Executive Summary

This document defines the authoritative **Production Architecture Specification** for the Oohdies Stackers protocol. It formally translates the empirical findings and mathematical verifications from Stages 1–6 into a hardened, enterprise-grade production architecture ready for commercial third-party smart contract audit.

### 1.1 Complete End-to-End Production Lifecycle Flow

```
[1. User Protocol Activity]
          │
          ▼ (Protocol Fees: ETH / USDC / USDT)
[2. RevenueCollector Contract]
          │
          ▼ (Sweeps & Velocity Limits)
[3. Protocol Treasury Multisig (Gnosis Safe 3-of-5 + Timelock 48h)]
          │
          ▼ (Authorized Execution & Oracle-Protected Route)
[4. Approved Asset Acquisition / Buyback Pipeline]
          │
          ▼ (Physical Approved Reward Tokens: AAPLx, USDG, etc.)
[5. RewardVault.depositReward()] ◄────── (Synchronized) ──────► [EarningEngine.fundReward()]
          │                                                          │
          │ (Solvent Token Reserves)                                 │ (Mathematical Accrual Index)
          ▼                                                          ▼
[6. Permissionless Claim Processing: RewardVault.claimReward(tokenId, asset)]
          │
          ▼ (Direct Transfer — No EOA Interception)
[7. Sovereign ERC-6551 Token Bound Account: accountOf(tokenId)]
          │
          ▼ (CALL-Only Execution by Current Live NFT Owner)
[8. Current Oohdies NFT Owner]
```

---

## 2. Core Protocol Components & Invariants

### 2.1 The Authoritative Smart Contracts
1. **`BananaToken.sol`**: Fixed-utility ERC-20 token. 100 BANANA are permanently burned upon every valid NFT stock pick activation.
2. **`OohdiesNFT.sol`**: Core ERC-721 collection (10,000 max supply). Features transfer hooks (`onNftTransfer`) that automatically notify downstream contracts upon secondary market sales.
3. **`ActivationController.sol`**: Activation gatekeeper. Enforces exact 3-stock pick selections from the registered asset whitelist, burns 100 BANANA, and deactivates picks upon token transfer.
4. **`EarningEngine.sol`**: High-precision ($10^{36}$ scale) mathematical distribution ledger. Divides reward emissions equally among active pickers, supports Collection Q staking multipliers, and preserves unpicked streams without token loss.
5. **`RewardVault.sol`**: Custodial token vault. Receives physical reward tokens and permissionlessly routes claims strictly to the NFT's ERC-6551 account. Reverts atomically if vault balance is insufficient.
6. **`OohdiesAccount.sol`**: Sovereign ERC-6551 Token Bound Account. Resolves ownership live from `OohdiesNFT.ownerOf(id)`, permits CALL-only execution (`op == 0`), rejects delegatecalls, and prevents ownership cycles.

### 2.2 Mathematical & Solvency Invariants
- **Vault Solvency Guarantee**: $\text{totalClaimed}[A] \le \text{totalDeposited}[A]$ for all assets across all permutations.
- **Accrual Monotonicity**: $\text{getAccruedReward}(tokenId, asset) \ge 0$ under all join/leave interleavings.
- **Dynamic Transfer Alignment**: Assets in a Token Bound Account transfer control immediately and irrevocably to the buyer upon NFT sale.

---

## 3. Production Governance, Treasury & Risk Controls

### 3.1 3-Tier Governance Hierarchy
- **Tier 1 (Admin DAO / Multisig)**: Minimum 3-of-5 Gnosis Safe behind a 48-hour TimelockController. Manages contract wiring, parameter updates, and asset whitelisting.
- **Tier 2 (Operational Funder)**: Automated treasury bot with daily funding budget limits and `isFunder` permissions in `EarningEngine`.
- **Tier 3 (Emergency Security Council)**: Fast-response multi-sig with emergency `pause()` authority to halt state-changing calls during critical incidents.

### 3.2 Real-World Asset (RWA) & Legal Compliance Gate
- Equity-linked tokens and stock proxies require formal securities counsel review, broker-dealer custody, and Proof-of-Reserve oracle integration prior to public enablement.

---

## 4. Architecture Specifications Cross-Reference Index

| Specification Topic | Dedicated Detailed Document |
| :--- | :--- |
| **System Inventory & Baseline Hashes** | [`system_inventory.json`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/system_inventory.json) & [`contract_baseline_hashes.json`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/contract_baseline_hashes.json) |
| **Authoritative vs. Testnet Boundary** | [`authoritative_vs_testnet_only.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/authoritative_vs_testnet_only.md) |
| **Revenue Ingestion & Treasury Model** | [`revenue_treasury_spec.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/revenue_treasury_spec.md) |
| **Asset Acquisition & Buyback Route** | [`acquisition_buyback_spec.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/acquisition_buyback_spec.md) |
| **Reward Funding & Emission Rules** | [`reward_funding_policy.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/reward_funding_policy.md) |
| **ERC-6551 TBA Security & Operation** | [`erc6551_production_policy.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/erc6551_production_policy.md) |
| **Governance & Privileged RBAC** | [`governance_role_matrix.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/governance_role_matrix.md) |
| **Upgradeability & Immutability Strategy**| [`upgradeability_policy.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/upgradeability_policy.md) |
| **Real-Time Telemetry & Incident Ops** | [`monitoring_incident_response.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/monitoring_incident_response.md) |
| **Draft Mainnet Deployment Runbook** | [`mainnet_deployment_runbook_DRAFT.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/mainnet_deployment_runbook_DRAFT.md) |
| **External Security Audit Scope** | [`external_audit_scope.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/external_audit_scope.md) |
| **Production Threat Model** | [`threat_model_production.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/threat_model_production.md) |
| **Mathematical Proofs & Invariants** | [`accounting_invariants.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/accounting_invariants.md) |
| **Open Decisions & Assumptions Log** | [`known_assumptions_and_open_decisions.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/known_assumptions_and_open_decisions.md) |
| **Stage 1–6 Testnet Evidence Index** | [`stage1_to_stage6_evidence_index.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/stage1_to_stage6_evidence_index.md) |
| **5-Pillar Mainnet Launch Checklist** | [`mainnet_go_no_go_checklist.md`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/audit-readiness/stage7/mainnet_go_no_go_checklist.md) |
