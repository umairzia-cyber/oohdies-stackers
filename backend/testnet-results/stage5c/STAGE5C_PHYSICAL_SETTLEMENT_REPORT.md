# OOHDIES STACKERS — STAGE 5C PHYSICAL SETTLEMENT REPORT
**Testnet Physical Revenue Settlement & Mock Liquidity-Pool E2E**

- **Audit Timestamp:** `2026-08-19T02:01:00.985Z`
- **Network:** `Robinhood Chain Testnet` (Chain ID: `46630` / `0xb626`)
- **Settlement Verdict:** **`VERDICT A: ACTUAL ON-CHAIN TWO-WAY PHYSICAL SETTLEMENT PROVEN`**
- **Test-Only Liquidity Pool Address:** `0x1e20451f6F5a2884a66416682928eFb478527539`
- **Token #4 Status:** **100% Untouched & Preserved**
- **Frontend Diff:** **100% Empty (0 files modified)**

---

### **1. Executive Summary & Architecture**

Stage 5C successfully established and proved on-chain a complete, two-way physical revenue-settlement simulation on Robinhood Chain Testnet:

$$\text{User Fee (REV)} \xrightarrow{\text{Physical Transfer}} \text{TestnetRevenueSimulator} \xrightarrow{\text{Physical REV Settlement}} \text{TestnetPhysicalLiquidityPool} \xrightarrow{\text{Physical Reward Asset}} \text{TestnetRevenueSimulator} \rightarrow \text{RewardVault} \rightarrow \text{NFT TBA} \rightarrow \text{Owner EOA}$$

- **Converted REV physically leaves the simulator** and enters `TestnetPhysicalLiquidityPool` (`0x1e20451f6F5a2884a66416682928eFb478527539`).
- **Reward tokens physically leave the pre-funded pool reserve** and enter the simulator.
- **Physical REV Invariant:** $\text{Simulator Physical REV} = \text{Simulator Unconverted REV}$ holds exactly at all times down to 0 wei.

---

### **2. Physical Two-Way Settlement Evidence**

| Asset | Conversion Rate | REV Spent (wei) | Reward Acquired (raw) | Settlement Tx Hash | Block # |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AAPLx** (18 dec) | 1 REV : 0.5 AAPLx | `40.0 REV` (`40*10^18`) | `20.0 AAPLx` (`20*10^18`) | `0xdb4007fd7c2e4441365f367808437d21b710186b9c142da91932e910f01bcc78` | #103583580 |
| **USDG** (6 dec) | 1 REV : 1.0 USDG | `30.0 REV` (`30*10^18`) | `30.0 USDG` (`30*10^6`) | `0xc52bb1e887f4fb0d963527683d3b39c16f19fe5b76f7e796daf49f9b513023d0` | #103583688 |
| **GMEx** (18 dec) | 1 REV : 0.5 GMEx | `20.0 REV` (`20*10^18`) | `10.0 GMEx` (`10*10^18`) | `0x6608827bda914a84f1809b38477078fbdbe9c70799009ad61e8693ea261bf2a3` | #103583775 |

---

### **3. End-to-End NFT Flow & Transfer Proof (Token #84)**

1. **Mint & Activation:** Minted Token #84 to Alice, activated with `[AAPLx, USDG, GMEx]`.
2. **Accrual & Claim to TBA:** Alice claimed AAPLx directly into TBA (`0xC5fCcfc9c8c5498D127B98082Abcd237EA6d6521`) via tx `0xba609f7f453f32c8810c2117c057674c323e70fb2d132f402b518e1b1340ba9d`.
3. **Owner Partial Withdrawal:** Alice executed `OohdiesAccount.execute` to withdraw 50% to Alice's EOA via tx `0xd543d73e2d0e406511bb15a1a5bf582c852cfcc2c2ace2bc1c613c2356a8ffbd`.
4. **Loaded NFT Transfer (Alice $\rightarrow$ Bob):** Transferred Token #84 to Bob via tx `0x855f025d5e15b7c929352fd609fed2bcc0b37c7c47c9ba5218109ba8bce7740b`.
5. **Seller Lockout:** Alice attempted execution on TBA $\rightarrow$ reverted with `NotAuthorized()`.
6. **Buyer Full Withdrawal:** Bob executed `OohdiesAccount.execute` to withdraw remaining balance to Bob's EOA via tx `0x33643f73636769df269ca1aed1be5d4d77023d0dc7d31f9c05212cba99bb5703`.

---

### **4. Live Testnet Attack Matrix**

- **ATK_01 (Overspend Unconverted REV):** Reverted atomically with `InsufficientUnconvertedRevenue` (PASS).
- **ATK_02 (Attacker Pool Revenue Withdrawal):** Reverted atomically with `OwnableUnauthorizedAccount` (PASS).
- **ATK_03 (Attacker Pool Rate Manipulation):** Reverted atomically with `OwnableUnauthorizedAccount` (PASS).
- **ATK_04 (Attacker TBA Hijacking):** Reverted atomically with `NotAuthorized` (PASS).

---

### **5. Stage 5C Artifacts Persisted**

All 14 Stage 5C artifacts are saved in `backend/testnet-results/stage5c/`:
1. `STAGE5C_PHYSICAL_SETTLEMENT_REPORT.md`
2. `stage5c_summary.json`
3. `stage5c_deployment.json`
4. `stage5c_pool_configuration.json`
5. `stage5c_liquidity_reserves.json`
6. `stage5c_settlement_transactions.json`
7. `stage5c_rev_conservation.json`
8. `stage5c_reward_conservation.json`
9. `stage5c_vault_funding.json`
10. `stage5c_nft_reward_flow.json`
11. `stage5c_transfer_tba_flow.json`
12. `stage5c_attack_matrix.json`
13. `stage5c_temporary_role_cleanup.json`
14. `stage5c_token4_preservation.json`
