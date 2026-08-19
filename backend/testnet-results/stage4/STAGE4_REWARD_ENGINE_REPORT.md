# OOHDIES STACKERS — STAGE 4 REWARD ENGINE REPORT

**Target Network:** Robinhood Chain Testnet  
**RPC Endpoint:** `https://rpc.testnet.chain.robinhood.com`  
**Decimal Chain ID:** `46630`  
**Raw JSON-RPC Chain ID:** `0xb626`  
**Execution Timestamp:** 2026-08-18T23:42:58.321Z  
**Overall Verdict:** `PASS` (100% Invariants Verified)

---

## 1. Executive Summary

Stage 4 rigorously audited and proved that the deployed Oohdies Stackers reward engine on Robinhood Chain Testnet preserves all mathematical, isolation, and security invariants across:
- All 12 registered reward assets (`USDG`, `AAPLx`, `TSLAx`, `NVDAx`, `MSFTx`, `AMZNx`, `GOOGLx`, `METAx`, `PLTRx`, `AMDx`, `GMEx`, `SPCXx`);
- Multiple disjoint and overlapping NFT stock pick sets;
- Activation, claim, transfer, deactivation, and reactivation lifecycles;
- 6-decimal (`USDG`) and 18-decimal reward streams;
- Underfunded vault atomic error handling (`InsufficientVaultBalance`);
- Token #4 absolute preservation (100% untouched);
- Zero frontend modifications (`umair_crypto_website/` untouched).

---

## 2. Core Invariants Verification Matrix

| Invariant | Description | Tested Scenario | Verdict |
| :--- | :--- | :--- | :--- |
| **A. Selection Isolation** | Activated NFT accrues rewards strictly for its 3 chosen assets. All 9 unselected assets produce 0 accrual delta. | 4 Disjoint Token Groups (Tokens #72, #73, #74, #75) covering all 12 assets | **PASS** |
| **B. Selected-Asset Accrual** | Selected assets accrue strictly by reward rate, duration, and active picker count ($1/N$ split). | Tokens #76, #77, #78 splitting AAPLx stream | **PASS** |
| **C. Asset Isolation** | Claiming or funding asset A does not alter picker counts, baselines, or balances of asset B. | USDG Claim on Token #72 with AAPLx and TSLAx untouched | **PASS** |
| **D. NFT Isolation** | Operations on Token A do not shift Token B's baseline or consume Token B's rewards. | Bidirectional claims across Alice and Bob | **PASS** |
| **E. No Retroactive Rewards** | Newly activated NFTs start earning strictly from activation timestamp onward. | Token #79 late activation on active GMEx emission | **PASS** |
| **F. Zero-Picker Integrity** | Unpicked streams hold funded emissions without leaking or allocating to other NFTs. | GMEx funded with 0 pickers before Token #79 activation | **PASS** |
| **G. Conservation of Funds** | Sum of claim payouts strictly matches wei deduction from RewardVault balance. | Exact balance tracking across all claim receipts | **PASS** |

---

## 3. 12-Asset Disjoint Selection Matrix

| Token ID | Owner | Selected Picks (3 Assets) | Unselected Assets (9 Assets) | Accrual Delta on Unselected |
| :--- | :--- | :--- | :--- | :--- |
| **Token #72** | Alice | `USDG`, `AAPLx`, `TSLAx` | `NVDAx, MSFTx, AMZNx, GOOGLx, METAx, PLTRx, AMDx, GMEx, SPCXx` | **0.0 (Zero)** |
| **Token #73** | Bob | `NVDAx`, `MSFTx`, `AMZNx` | `USDG, AAPLx, TSLAx, GOOGLx, METAx, PLTRx, AMDx, GMEx, SPCXx` | **0.0 (Zero)** |
| **Token #74** | Alice | `GOOGLx`, `METAx`, `PLTRx` | `USDG, AAPLx, TSLAx, NVDAx, MSFTx, AMZNx, AMDx, GMEx, SPCXx` | **0.0 (Zero)** |
| **Token #75** | Bob | `AMDx`, `GMEx`, `SPCXx` | `USDG, AAPLx, TSLAx, NVDAx, MSFTx, AMZNx, GOOGLx, METAx, PLTRx` | **0.0 (Zero)** |

---

## 4. Live Testnet Transactions Recorded (20 Total)

1. **Phase 2 — Mint Token A for Alice**: [`0x618117c14ce2820e67d79cd4917b063fdda409b5e4c49b301c70c020f5997aea`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532181, Gas: 78520, Status: SUCCESS)
2. **Phase 2 — Mint Token B for Bob**: [`0x179ecfa1295764000bc829abde76ecfc98a4f8ff3aa5ed13c6207eb9633031e0`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532233, Gas: 78520, Status: SUCCESS)
3. **Phase 2 — Mint Token C for Alice**: [`0x4df9736dfbb06ce051e349248c5a39a3e072f2486075db6aeb69db2c1a499978`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532259, Gas: 78520, Status: SUCCESS)
4. **Phase 2 — Mint Token D for Bob**: [`0x17851495de76a7c4bac6ab71cf088a9a19e6ecb7e8d99bb926bfad7807dacbe5`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532318, Gas: 78520, Status: SUCCESS)
5. **Phase 2 — Alice Activate Token #72 [USDG, AAPLx, TSLAx]**: [`0x9cae3171ad4fe1c05e2ca8e688eedcabfd9d976a359eaa092471c56f696c7b38`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532379, Gas: 583726, Status: SUCCESS)
6. **Phase 2 — Bob Activate Token #73 [NVDAx, MSFTx, AMZNx]**: [`0x5a77f3219e34408d2093176bb2379609eb5ba70ee2e7d6e03c44289a80a9d0d0`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532439, Gas: 584071, Status: SUCCESS)
7. **Phase 2 — Alice Activate Token #74 [GOOGLx, METAx, PLTRx]**: [`0x024c951d22f044058c475e2bd680754a08e149ae493e8c96107430df1d6cf11a`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532494, Gas: 584441, Status: SUCCESS)
8. **Phase 2 — Bob Activate Token #75 [AMDx, GMEx, SPCXx]**: [`0x9dcb1ee98452e39ee74bbbb4bee2460644eda027ccdc5188118d3e993d980f6c`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532591, Gas: 575567, Status: SUCCESS)
9. **Phase 3 — Alice Activate Token #76 with AAPLx**: [`0x55d03fcbe9dd05e7d4ecb54dc5a1ed278d64a1ee0e6e37db8eec58f3cadef3fb`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532834, Gas: 583869, Status: SUCCESS)
10. **Phase 3 — Bob Activate Token #77 with AAPLx**: [`0x73883e798922def519e8bf156fda41e5a4fd53112ead499e222a373fd172c345`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532903, Gas: 584215, Status: SUCCESS)
11. **Phase 3 — Alice Activate Token #78 with AAPLx**: [`0xb62d4b8dc63ecdd44abadb92817c0cbee9888ea67e2352b9af4d0d01fd56f0a5`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103532956, Gas: 583570, Status: SUCCESS)
12. **Phase 3 — Fund EarningEngine with 60 AAPLx over 7 days**: [`0x9f1997f2e68b6f5c831acc4d9952e7de247e122dc4ddfc8644b8fe66ff52462d`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533157, Gas: 99490, Status: SUCCESS)
13. **Phase 3 — Transfer Token #78 (Deactivates Token G picks)**: [`0xb2611b412e89027ebff62b975c86a191150eb308486ba2551f45de1574b7b56c`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533254, Gas: 282105, Status: SUCCESS)
14. **Phase 4 — Fund USDG (50.0 USDG over 7 days)**: [`0x9c4ddd77fc79e044945387d2c78c66d3177ae2b389aa9acd5a25821b4b4699c3`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533485, Gas: 99454, Status: SUCCESS)
15. **Phase 4 — Alice Claim USDG for Token #72**: [`0x38d140cb7fb57555ff3d466616d3f18d0a1d8b6b646e212f2d6fc2ca62c482f7`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533588, Gas: 162055, Status: SUCCESS)
16. **Phase 5 — Fund GMEx (50 GMEx over 7 days)**: [`0x364dc0f12a4fa1a7a67a27cdbd932c0fb5d48ca9176968a44de77472682c2603`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533691, Gas: 94690, Status: SUCCESS)
17. **Phase 5 — Alice Activate Fresh Token #79 with GMEx**: [`0x2909e822dd64063dfcacd36a54683524fc4b3bc3f83212f2ed98519412d87763`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533833, Gas: 583797, Status: SUCCESS)
18. **Phase 6 — Transfer Token #76 Alice -> Bob**: [`0x08667564c8369bab4f7527271cc25cd7cc02a3e78089b6d1750569661b010d2d`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103533960, Gas: 282105, Status: SUCCESS)
19. **Phase 6 — Bob Reactivate Token #76 with [MSFTx, AMZNx, GOOGLx]**: [`0x4849b9cce485e0ebe8237903f6e58dc8432b7d1b024f69f8e45e3d373975e414`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103534055, Gas: 575621, Status: SUCCESS)
20. **Phase 6 — Bob Claim Preserved AAPLx for Token #76**: [`0x945ac4033de55ed4ec67746e3120533aa6e6ebe972acbd540404d212c1153657`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage4/stage4_live_transactions.json) (Block #103534106, Gas: 142876, Status: SUCCESS)

---

## 5. Token #4 Absolute Preservation Audit

- **Token #4 Owner:** `0xe77E25f891C21de29E6d6674941e30F19DdA86C7` $\rightarrow$ `0xe77E25f891C21de29E6d6674941e30F19DdA86C7` (**Preserved: YES**)
- **Token #4 Activation State:** `true` $\rightarrow$ `true` (**Preserved: YES**)
- **Token #4 Picks Count:** `3` $\rightarrow$ `3` (**Preserved: YES**)
- **Token #4 TBA Address:** `0xB870c844f50769bCB1C5B43C6652475c9fb19278` $\rightarrow$ `0xB870c844f50769bCB1C5B43C6652475c9fb19278` (**Preserved: YES**)
- **Verdict:** **100% UNTOUCHED**

---

## 6. Scope Compliance

- **Frontend files modified:** `0` (`umair_crypto_website/` clean)
- **Local Unit Suite:** `419 passing, 0 failing`
- **Overall Stage 4 Verdict:** **PASS**
