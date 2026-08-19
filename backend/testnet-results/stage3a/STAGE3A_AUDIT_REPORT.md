# STAGE 3A — LIVE TESTNET EVIDENCE AUDIT & COVERAGE CLOSURE REPORT

**Target Network:** Robinhood Chain Testnet  
**Chain ID:** `46630` (Hex: `0xb626`)  
**RPC Endpoint:** `https://rpc.testnet.chain.robinhood.com`  
**Execution Timestamp:** 2026-08-18T22:34:21.716Z  
**Overall Verdict:** `PASS` (100% — All 10 Testnet Coverage Gaps Closed)  

---

## 1. Executive Summary & Audit Findings

1. **Historical Receipt Audit**: Independently verified all 21 Stage 3 transactions on Robinhood Testnet. Every transaction exists, confirmed with `status === 1` (SUCCESS), and matches recorded block numbers, gas units, and event logs.
2. **Deterministic Revenue Spikes**: Verified exact integer arithmetic conversion for 10, 100, and 1,000 REV inputs into AAPLx.
3. **Replay & Overspend Protection**: Proved double-spending and overspending unconverted revenue strictly reverts with `InsufficientUnconvertedRevenue`.
4. **Multiple Picker Division & Transfer Deactivation**: Verified equal 1/3 division among 3 active pickers, automatic pick deactivation on NFT transfer, and subsequent 1/2 division among remaining pickers without historical corruption.
5. **Claim-Order Independence**: Proved that claim sequence (Claimant A then Claimant B) does not reduce or corrupt Claimant B's entitlement.
6. **Transfer & Reactivation**: Proved old accrued rewards remain claimable to the TBA after transfer, while only newly selected assets accrue new rewards.
7. **Decimal Scaling Proof**: Validated 6-decimal (`USDG`) and 18-decimal (`AAPLx`) raw units across the complete lifecycle with 0 truncation errors.
8. **Underfunded Vault Behavior**: Confirmed on-chain revert with custom error `InsufficientVaultBalance` and atomic state preservation.
9. **Attacker Matrix**: Successfully executed 9 adversarial attack tests; all were strictly blocked.
10. **Token #4 & Frontend Preservation**: Proved Token #4 was 100% untouched, and 0 frontend modifications occurred.

---

## 2. On-Chain Transaction Log (19 Transactions)
| Gap | Action | Tx Hash | Block | Gas | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Setup | Authorize Simulator as Funder | `0xac6caa2909f52964a20eb09569287e602c372cce8bc76aceacd877fc951a399a` | 103507553 | 54668 | SUCCESS |
| Setup | Set AAPLx Conversion Rate (1:0.5) | `0xcf17cac83dccd527c1c057f6818586defe5bb07a971c49b65ba1c2602902e0c8` | 103507579 | 102941 | SUCCESS |
| Setup | Set USDG Conversion Rate (1:1.0) | `0x9defa3453507586b5f568c1b2b0a439af2b9d312648a73935e16f09d1db5d403` | 103507600 | 102941 | SUCCESS |
| Gap 2 | Fee Payment (10.0 REV) | `0x9c777a9bebc9e78e11233dd4d850e0073a4aabc425a6ad01ea477e03bb6343ce` | 103507805 | 115324 | SUCCESS |
| Gap 2 | Acquire AAPLx from 10.0 REV | `0x6e379a11a5994238f282c33a05a816ca6ee73245c6dd91c58743227dd43ec2ff` | 103507814 | 131480 | SUCCESS |
| Gap 2 | Fee Payment (100.0 REV) | `0x70320638bc4111fb191988063e51737ab0d8fb9e6d8d70b626336cbe9a828cf7` | 103507886 | 81217 | SUCCESS |
| Gap 2 | Acquire AAPLx from 100.0 REV | `0x08a5f3a9d5edc0cc95a0132323e536947dd22eafa25ce6cbcace62252791fdce` | 103507913 | 80192 | SUCCESS |
| Gap 2 | Fee Payment (1000.0 REV) | `0x9a8a65a9ca9519b78536dcae36b52380ddbe51b59bde4153f6198c3607495850` | 103507956 | 81449 | SUCCESS |
| Gap 2 | Acquire AAPLx from 1000.0 REV | `0x0e1016450f0833f125239a0cb72f93d303ad043ae8dcf08538e90cca29fe04d5` | 103508017 | 80192 | SUCCESS |
| Gap 4 | Alice Activate Token #40 | `0x3a0f5ec80006b91e1344e3d10b1671679befb75c1f047b26d0498d658e5442bf` | 103508154 | 573228 | SUCCESS |
| Gap 4 | Bob Activate Token #41 | `0xd78a59a704cce335e8a87c5e6927a6de1a9424d7258b1d3d494f3254f7c4d54d` | 103508222 | 572851 | SUCCESS |
| Gap 4 | Attacker Activate Token #42 | `0x27b36f719b255066a215a98c763a41395c928d946d5cf188899bc5662b054bfc` | 103508264 | 572782 | SUCCESS |
| Gap 4 | Fund EarningEngine AAPLx (60 tokens, 7 days) | `0x64e9f08ab43b3bec3738448ab57105c765fd8b0ad13e1df6a889716a755f1400` | 103508440 | 91485 | SUCCESS |
| Gap 4 | Transfer Token #42 (Deactivates Picks) | `0x4cc68cd3779b68cfa1f7530e4ac649a1b018b25ffbe1c3920634a9b7671a60e0` | 103508502 | 272906 | SUCCESS |
| Gap 5 | Alice Claim Token #40 (Order 1) | `0xf4b23b6c43cbe70ae1480d450135cd5f4252d49e25b318d64270148477c8f083` | 103508655 | 155245 | SUCCESS |
| Gap 5 | Bob Claim Token #41 (Order 2) | `0x2d0986cd07ee3f4b305339a242a0a93444c7d741e085ef702c79f193f8c9e5ac` | 103508678 | 155245 | SUCCESS |
| Gap 6 | Alice Activate Token #43 with [AAPLx, TSLAx, NVDAx] | `0xde81dac4b5364d554be5a31d4edb1d4825d27e33567d53021affc9cdeb24c912` | 103508703 | 573091 | SUCCESS |
| Gap 6 | Alice Transfer Token #43 -> Bob | `0x5d3ff3e2532e139051aa8f27072d830fd7e9b760c100be2c7bfdc058b031a393` | 103508773 | 274103 | SUCCESS |
| Gap 6 | Bob Reactivate Token #43 with [MSFTx, AMZNx, GOOGLx] | `0xed7bec533fcdda6a4c637c75412bfb571aa8af145836872a936a8296d3d09bcd` | 103508811 | 572942 | SUCCESS |

---

## 3. Attacker Matrix Results
| Action | Role | Expected | Result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| 1. Withdraw revenue from Simulator | Attacker | REVERT | REVERT | PASS |
| 2. Unauthorized reward acquisition | Attacker | REVERT | REVERT | PASS |
| 3. Unauthorized conversion rate alteration | Attacker | REVERT | REVERT | PASS |
| 4. Fund invalid vault address | Attacker | REVERT | REVERT | PASS |
| 5. Withdraw from Alice's TBA as Attacker | Attacker | REVERT | REVERT | PASS |
| 6. Activate Alice's NFT as Attacker | Attacker | REVERT | REVERT | PASS |
| 7. Unauthorized transfer of Alice's NFT | Attacker | REVERT | REVERT | PASS |
| 8. Redirect claim payout to Attacker EOA | Attacker | 0 GAIN (TBA ONLY) | 0 GAIN | PASS |
| 9. Replay conversion of already-converted revenue | Attacker | REVERT | REVERT | PASS |
