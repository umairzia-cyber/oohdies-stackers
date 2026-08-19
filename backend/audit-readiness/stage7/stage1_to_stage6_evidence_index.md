# OOHDIES STACKERS — STAGE 1 TO STAGE 6 EVIDENCE INDEX

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Historical Testnet & Local Audit Evidence Directory  
**Date:** 2026-08-19  

---

## 1. Executive Summary & Test Progression Overview

Stages 1 through 6 established an unbroken chain of cryptographic and empirical evidence demonstrating the functional correctness, economic conservation, adversarial resistance, and physical settlement mechanics of Oohdies Stackers on **Robinhood Chain Testnet** (`46630`) and local testbeds.

| Stage | Primary Focus | Verification Mode | Key Invariant / Outcome | Evidence Artifact Location |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | Contract Deployment & Inter-Contract Wiring | Testnet On-Chain | Deployed core contracts; validated addresses & constructors | `backend/testnet-results/stage1/` |
| **Stage 2** | ERC-6551 TBA Derivation & Identity | Testnet On-Chain | Proved deterministic CREATE2 address derivation | `backend/testnet-results/stage2/` |
| **Stage 3** | Revenue Simulation & Decimal Scaling | Testnet On-Chain | Proved 6-dec (USDG) and 18-dec (AAPLx) acquisition scaling | `backend/testnet-results/stage3/` |
| **Stage 4** | Multi-Picker Division & State Machine | Testnet On-Chain | Proved exact $\frac{1}{N}$ stream division & transfer deactivation | `backend/testnet-results/stage4/` |
| **Stage 5A** | Economic Ledger Reconciliation | Testnet On-Chain | Reconciled all historical balances across 12 reward assets | `backend/testnet-results/stage5a/` |
| **Stage 5B** | Physical Settlement Lifecycle | Testnet On-Chain | Traced fee -> swap -> vault -> TBA -> EOA withdrawal | `backend/testnet-results/stage5b/` |
| **Stage 5C** | Physical Liquidity Pool & Conservation | Testnet On-Chain | Executed two-way swaps; verified exact conservation | `backend/testnet-results/stage5c/` |
| **Stage 6** | Adversarial Security & Fuzzing | Testnet + Local | 97 adversarial tests; 1,250 fuzz sequences; 0 invariant violations | `backend/testnet-results/stage6/` |

---

## 2. Stage 5C Physical Settlement Deliverables Index (`backend/testnet-results/stage5c/`)

1. `STAGE5C_PHYSICAL_SETTLEMENT_REPORT.md` — Formal report proving physical two-way settlement.
2. `stage5c_deployment.json` — Deployment record for `TestnetPhysicalLiquidityPool`.
3. `stage5c_pool_configuration.json` — Approved exchange rates and decimal scaling configuration.
4. `stage5c_liquidity_reserves.json` — Pre-settlement pool reserve inventory.
5. `stage5c_settlement_transactions.json` — Comprehensive transaction hash log and receipt data.
6. `stage5c_rev_conservation.json` — Mathematical proof of REV conservation ($\Delta \text{REV}_{\text{sim}} = \Delta \text{REV}_{\text{pool}}$).
7. `stage5c_reward_conservation.json` — Mathematical proof of reward token conservation.
8. `stage5c_vault_funding.json` — Direct vault deposit receipts.
9. `stage5c_nft_reward_flow.json` — Token #4 reward claim data.
10. `stage5c_transfer_tba_flow.json` — Post-transfer TBA asset withdrawal receipts.
11. `stage5c_token4_preservation.json` — Cryptographic proof of Token #4 ownership integrity.
12. `stage5c_attack_matrix.json` — Unauthorized pool drain and rate manipulation test proofs.
13. `stage5c_temporary_role_cleanup.json` — Funder role revocation and permission restoration.
14. `stage5c_summary.json` — Machine-readable Stage 5C execution summary.

---

## 3. Stage 6 Adversarial Security Deliverables Index (`backend/testnet-results/stage6/`)

1. `STAGE6_SECURITY_VERIFICATION_REPORT.md` — Complete adversarial testing summary signoff.
2. `stage6_threat_model.md` — Threat model specification covering all threat vectors.
3. `stage6_adversarial_matrix.json` — Full execution matrix of 41 on-chain and 97 local test vectors.
4. `stage6_adversarial_report.md` — Detailed breakdown of adversarial resilience across all categories.
5. `stage6_erc6551_attack_surface.md` — Deep security audit of Token Bound Accounts and ownership cycles.
6. `stage6_fuzz_report.json` — Structured metrics from 1,250 fuzz sequence state-machine runs.
7. `stage6_fuzz_report.md` — Fuzz testing analysis and mathematical monotonicity proof.
8. `stage6_access_control_matrix.json` — Exhaustive access control rejection log.
9. `stage6_activation_security.json` — BANANA burn and pick combinatorics verification.
10. `stage6_reward_vault_security.json` — Vault isolation, claim permissioning, and underfunding proofs.
11. `stage6_reentrancy_verification.json` — ReentrancyGuard validation against hostile tokens.
12. `stage6_settlement_security.json` — Physical liquidity pool security and solvency bounds.
13. `stage6_race_condition_audit.json` — Multi-picker race condition and transfer interleaving proofs.
14. `stage6_invariants_proof.json` — Post-suite invariant validation on live Testnet state.
15. `stage6_live_testnet_receipts.json` — Receipts of live on-chain adversarial simulations on chain 46630.
