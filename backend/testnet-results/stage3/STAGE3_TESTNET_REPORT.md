# STAGE 3 — TESTNET ECONOMIC & REVENUE FLOW REPORT

**Network:** Robinhood Chain Testnet  
**Chain ID:** `46630` (`0xb626`)  
**RPC:** `https://rpc.testnet.chain.robinhood.com`  
**Timestamp:** 2026-08-18T20:19:13.666Z  
**Verdict:** `PASS` (100% — All Verification Phases Passed)

---

## 1. Simulation Infrastructure Deployed
- **MockRevenueToken (REV):** `0xd20A8A27534F5ebdf0B36ACe3e2f370d68B8AFCA`
- **TestnetRevenueSimulator:** `0xc5D48E1667c0BdE0FA02B75A6d245FD1D8e49A2D`

---

## 2. Complete Economic Pipeline Verified
1. **Fee Generation & Aggregation:** Alice (50 REV), Bob (100 REV), Attacker (25 REV) -> Total: 175 REV.
2. **Adversarial Security:** Unauthorized withdrawal & unauthorized acquisition strictly blocked.
3. **Deterministic Reward Acquisition:**
   - 100 REV -> 50.0 AAPLx (18 decimals).
   - 50 REV -> 50.0 USDG (6 decimals, correctly scaled).
   - Double-conversion & overspending strictly reverted.
4. **RewardVault & EarningEngine Funding:** Acquired assets deposited into RewardVault and streamed via EarningEngine.
5. **Multi-Picker NFT Accrual:** Fresh Token #20 (Alice) and #21 (Bob) split AAPLx stream; unselected USDG accrued 0.
6. **ERC-6551 Claims & Loaded Sale:**
   - Claim routed strictly to Token Bound Account (`0x97cA096547b2594a50d36C38E4B310D9273b7fA1`).
   - Token #20 transferred to Bob with loaded USDG.
   - TBA address remained identical. Alice locked out. Bob withdrew loaded assets.

---

## 3. On-Chain Transaction Log (21 Transactions)
| Action | Tx Hash | Block | Gas | Status |
| :--- | :--- | :--- | :--- | :--- |
| Authorize Simulator as Funder | `0x6a66259044125fed7e9e960826688f0febc5f8bce01895b224c2a8811916627b` | 103459264 | 55340 | SUCCESS |
| Alice Generate Fee (50 REV) | `0x15a54611633e8d6d82e8c73b7fcbc4d80faa7dd188aa3b7e6e0c3ea3d6fd8e11` | 103459500 | 116545 | SUCCESS |
| Bob Generate Fee (100 REV) | `0xe73074c2ca3b8c4eb005c05d2aef64409c63b39b3dce0918999240909be1bec0` | 103459553 | 82345 | SUCCESS |
| Attacker Generate Fee (25 REV) | `0x8581e7d5d50f0528361d6524941487fd942c5d7fb40aa79961a3044e62fef48c` | 103459608 | 82321 | SUCCESS |
| Set AAPLx Conversion Rate (1:0.5) | `0x26899b808aa5ea4b11b78ff3f22bc38c146cb02315cecaf48870097b6b2e1998` | 103459651 | 103808 | SUCCESS |
| Set USDG Conversion Rate (1:1.0) | `0x695ace8a1d5184ba8e3efc6346d487dae1b8b8e94bff78865c461841d6a12a63` | 103459672 | 103732 | SUCCESS |
| Acquire 50.0 AAPLx via Revenue Conversion | `0x31486aee97288c0eae2a327921e958014ce08da94f884c59b7986e7d651085de` | 103459820 | 132286 | SUCCESS |
| Acquire 50.0 USDG via Revenue Conversion | `0x433659b715ccd0ab424e3d51e0442eee040d59c03c138db856472ea16030cde3` | 103459842 | 116018 | SUCCESS |
| Deposit Acquired AAPLx to RewardVault | `0xbb26bd164a52a0b7218a3eba9c833ddf0a03fbd4ba38ffd266aad81fc15a9f40` | 103459865 | 86324 | SUCCESS |
| Deposit Acquired USDG to RewardVault | `0x97530cd5b29603d40f43d503c446a0dcae62781a42d96aa5f50ad88ab1daf35d` | 103459885 | 86296 | SUCCESS |
| Fund EarningEngine AAPLx (7 days) | `0xd43956c3ccea5f8e9694b20331ebb6621be23b6f61340e7725f0461097fe3676` | 103460041 | 89418 | SUCCESS |
| Fund EarningEngine USDG (7 days) | `0x59894951f25c9d9f747d3e14d99933d93370b3ce2e7b6ffdc9bb493f7cb8e86a` | 103460133 | 84988 | SUCCESS |
| Mint Fresh NFT for Alice | `0xa27de25525ab8c4e2c3b4158c3aca118f444271f8f70e4bca108415bf631847a` | 103460200 | 71493 | SUCCESS |
| Mint Fresh NFT for Bob | `0x5ec8ece8919ffcb432943373568c5686327878c937a69304cdc9eb0f09dc98b6` | 103460222 | 71493 | SUCCESS |
| Alice Activate Token #20 | `0xb78b9720f72335d75b67782843b723946940c61029134f986966f2999ecbb72e` | 103460314 | 570001 | SUCCESS |
| Bob Activate Token #21 | `0x73c756b1d4c393ef4f5c0b5d4a089cec0029af24bece6cb4a848c91f022b6c3e` | 103460358 | 570063 | SUCCESS |
| Create TBA for Token #20 | `0x7091fc9ef4336a4ecffd01330cf89366d3eea37e4360fb857a800e08b1459cee` | 103460463 | 101942 | SUCCESS |
| Alice Claim AAPLx for Token #20 | `0x3c3625b46afd79a4cb2e17d432fdd721298b1a3355852f6e15fe21851a5dd74e` | 103460489 | 170605 | SUCCESS |
| Alice Withdraw AAPLx from TBA to EOA | `0x565f005f67a168bf061bc455fd6181e04e504c482c4bccf6c835c5ccf0ccd4ae` | 103460556 | 75372 | SUCCESS |
| Transfer Token #20 Alice -> Bob | `0xbce045b21b977b4130cd673bdcbc1fed644b3a39be2570c1fefe57fe652737d1` | 103460593 | 272056 | SUCCESS |
| Buyer (Bob) Withdraw Loaded USDG from TBA | `0x1644765e7ac3731b3f5ac0654fce9d50d587ff06831927eddd853403cb7c39bc` | 103460632 | 75275 | SUCCESS |
