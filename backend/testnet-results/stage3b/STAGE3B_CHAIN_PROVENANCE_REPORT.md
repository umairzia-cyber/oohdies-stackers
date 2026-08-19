# STAGE 3B — CHAIN-PROVENANCE CORRECTION & CLAIM-ORDER CLOSURE REPORT

**Target Network:** Robinhood Chain Testnet  
**RPC Endpoint:** `https://rpc.testnet.chain.robinhood.com`  
**Chain ID Decimal:** `46630`  
**Chain ID Raw Hex:** `0xb626`  
**Execution Timestamp:** 2026-08-18T22:58:17.122Z  
**Overall Verdict:** `PASS` (100% Verified)  

---

## 1. Raw RPC Chain Provenance Verification

Direct JSON-RPC `eth_chainId` queries were performed against the official Robinhood Chain Testnet RPC endpoint before and after historical receipt auditing:

| Check Phase | Timestamp (UTC) | Raw Hex (`eth_chainId`) | Parsed Decimal | Expected Hex | Expected Dec | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pre-Audit** | 2026-08-18T22:56:25.221Z | `0xb626` | `46630` | `0xb626` | `46630` | **PASS** |
| **Post-Audit** | 2026-08-18T22:56:53.145Z | `0xb626` | `46630` | `0xb626` | `46630` | **PASS** |

### Mathematical Correction
- **Decimal Value:** `46630`
- **True Hexadecimal Representation:** `0xb626` ($46630 = 11 \times 4096 + 6 \times 256 + 2 \times 16 + 6$)
- **Erroneous Hexadecimal String:** `0xb646` ($= 46662_{10}$) — all previous prose/comments have been permanently purged and corrected.

---

## 2. Historical Receipt Re-Audit (40 Transactions)

All historical transactions across Stage 3 (21 transactions) and Stage 3A (19 transactions) were re-fetched from the authoritative RPC endpoint and validated for execution status, gas consumption, and event emission:

- **Total Receipts Audited:** `40`
- **Successful Receipts (`status: 1`):** `40`
- **Failed Receipts:** `0`
- **Audit Verdict:** **PASS (100% On-Chain Evidence Verified)**

*(Full transaction table with block numbers, gas metrics, and contract addresses is recorded in [`stage3b_historical_receipts.json`](file:///c:/Users/Del/Downloads/oohdies-stackers-main/oohdies-stackers-main/full/backend/testnet-results/stage3b/stage3b_historical_receipts.json)).*

---

## 3. Reversed Claim-Order Independence Test

To complete claim-order closure, a live-testnet scenario was executed where **Bob (Token #48) claimed FIRST**, and **Alice (Token #47) claimed SECOND**:

### Common State Point (Block #103517718)
- **Alice Claimable (Token #47):** `0.005241058709250992 AAPLx`
- **Bob Claimable (Token #48):** `0.004306069342337772 AAPLx`
- **RewardVault Balance:** `2439.871890614360971795 AAPLx`

### Execution Sequence & State Assertions
1. **Step 1 — Bob Claims First (Block #103517743, Tx: `0xbada71c681a5378690100cce64da4a3e7f09b93e051bfc3b50b6e94bb9a69cde`):**
   - Bob Claimed Payout: `0.00471319359576897 AAPLx` paid into Bob's TBA.
   - Alice Claimable Immediately Sampled: `0.006258869342828987 AAPLx`
   - **Assertion:** `claimableAliceMid >= claimableAliceBefore` (**VERIFIED: Alice's entitlement was NOT reduced or consumed**).
2. **Step 2 — Alice Claims Second (Block #103517780, Tx: `0xfd35834c620e30aba9c6773eb0ab78e68f81357623b79823dc2a81f88869b758`):**
   - Alice Claimed Payout: `0.006564212532902385 AAPLx` paid into Alice's TBA.
   - **Vault Balance Conservation:** Total Vault deduction (`0.011277406128671355 AAPLx`) strictly equals sum of payouts (`0.011277406128671355 AAPLx`).

---

## 4. Final Verdict

**FINAL VERDICT: PASS**
- Raw RPC `eth_chainId` returned `0xb626` (Parsed: `46630`).
- All 40 historical receipts re-audited successfully on-chain.
- Reversed claim-order test passed with exact balance conservation.
- All documentation/code references to `0xb646` corrected to `0xb626`.
- Token #4 100% preserved.
- Frontend files modified: `0`.
