# OOHDIES STACKERS — PRODUCTION ASSET ACQUISITION & BUYBACK SPECIFICATION

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Production Replacement for Testnet Mock Liquidity Pool  
**Date:** 2026-08-19  

---

## 1. Production Acquisition Pipeline Architecture

In Stages 5A–5C and Stage 6 on Testnet, physical two-way settlement was demonstrated using `TestnetPhysicalLiquidityPool.sol` (a mock swap contract converting mock `REV` to mock tokenized stocks).

In **Production**, this mock contract is replaced by an enterprise-grade, compliant, and cryptographically verified **Acquisition & Buyback Engine**:

```
+─────────────────────────────────────────────────────────────────────────────────+
|                           PRODUCTION ACQUISITION FLOW                           |
+─────────────────────────────────────────────────────────────────────────────────+

[Treasury Revenue (USDC / WETH)]
       │
       ▼
[Compliance / Routing Verification Gateway]
       │
       ├─────────────────────────────────────────┬────────────────────────────────┐
       ▼                                         ▼                                ▼
[Route A: On-Chain DEX Aggregator]   [Route B: Regulated RWA Partner]   [Route C: Stable Staking]
(e.g., Uniswap v3 / Curve TWAP)      (e.g., Tokenized Equity/Gold)      (USDC / USDG / RWA Yield)
       │                                         │                                │
       └─────────────────────────────────────────┼────────────────────────────────┘
                                                 │
                                                 ▼ (Strict Slippage & Oracle Check)
                                 [Acquired Approved Reward Assets]
                                                 │
                                                 ▼ (Direct Transfer Verification)
                                    [RewardVault.depositReward()]
                                                 │
                                                 ▼ (Accrual Engine Synchronized)
                                     [EarningEngine.fundReward()]
```

---

## 2. Technical Requirements & Safeguards

### 2.1 Approved Reward Asset Whitelist
Only assets explicitly approved by on-chain governance and registered via `EarningEngine.registerRewardAsset()` may be acquired and distributed. Unwhitelisted assets cannot be activated or funded.

### 2.2 Oracle & Price Verification
- **Price Feeds**: Chainlink Decentralized Oracle Networks or TWAP (Time-Weighted Average Price) feeds with sub-minute granularity.
- **Stale Price Protection**: Any price update older than a configurable heartbeat (e.g., 3,600 seconds) or showing a price variance > 5% against secondary feeds causes an immediate trade halt (`StalePriceDetected` / `PriceDeviationExceeded`).
- **Min Return / Slippage Bounds**: Hardcoded slippage tolerance limit capped at maximum **1.00% (100 bps)** for on-chain swaps, with dynamic calculation based on pool depth.

### 2.3 Execution Constraints & Size Caps
- **Max Single Purchase Size**: Limited to no more than 10% of the 24-hour pool liquidity for on-chain DEX routes to prevent market impact and MEV sandwiching.
- **Rate-Limited Order Routing**: Large acquisitions must be split into automated TWAP micro-tranches executed over time.
- **Zero Arbitrary Output Destinations**: The acquisition contract's destination parameter is immutable or strictly locked to the `RewardVault` contract address. It cannot deliver purchased assets to any EOA or third-party address.

### 2.4 Error Handling & Circuit Breakers
- **Failed Trade Fallback**: If an acquisition trade reverts (slippage exceeded, insufficient liquidity), the source revenue remains in the Treasury without state loss.
- **MEV & Front-Running Defenses**: Private mempool submission (e.g. Flashbots Protect / MEV-Blocker) required for all large treasury execution transactions.
- **Circuit Breaker**: An automated volatility monitor that suspends buyback execution if the target asset price fluctuates by more than 15% within a 1-hour window.

---

## 3. Stock-Linked & Real-World Asset (RWA) Regulatory Compliance

> [!CAUTION]
> **CRITICAL LEGAL & COMPLIANCE REQUIREMENTS FOR EQUITY/STOCK ASSETS**:
>
> If the production protocol targets equity-linked rewards, synthetic stocks, or real-world securities (e.g., AAPL, NVDA, TSLA proxies):
> 
> 1. **Securities Law Compliance**: Real stock-linked tokens are typically classified as security tokens, derivatives, or tokenized securities subject to strict regulatory regimes (e.g., US SEC, CFTC, EU MiFID II, Swiss FINMA).
> 2. **Regulated Broker-Dealer & Custody**: Direct equity backing requires a licensed custodian, qualified depository, and broker-dealer infrastructure with audited 1:1 reserve proofs.
> 3. **Licensing & Jurisdictional Geofencing**: Offering tokenized stock rewards may require licensing (e.g. ATS, MTF) and mandatory geofencing to prevent access in restricted jurisdictions.
> 4. **No Autonomous Direct Stock Purchases**: Smart contracts cannot directly trade on NASDAQ/NYSE; all real stock acquisitions must occur through regulated off-chain counterparties with cryptographic reserve proofs (e.g., Chainlink Proof of Reserve).
> 5. **Action Required**: The project sponsors must obtain formal legal opinions from licensed securities counsel before deploying or marketing any equity-linked reward mechanics.
