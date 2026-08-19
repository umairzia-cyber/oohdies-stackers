# OOHDIES STACKERS — KNOWN ASSUMPTIONS & REQUIRED DECISION LOG

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Production Governance & Launch Decision Matrix  
**Date:** 2026-08-19  

---

## 1. Overview & Policy Statement

In accordance with strict audit-readiness standards, engineering cannot unilaterally assume critical business, legal, or governance parameters. This document enumerates every **Open Decision** that requires explicit resolution by protocol leadership, legal counsel, and the governance DAO prior to mainnet launch.

---

## 2. Production Governance & Architecture Decision Log

| # | Decision Topic | Available Options | Security & Operational Tradeoffs | Recommended Decision Criteria | Decision Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D-01** | **Target Mainnet Chain** | 1. Ethereum Mainnet (L1)<br>2. Arbitrum One (L2)<br>3. Base (L2)<br>4. Robinhood Chain Mainnet | L1 has maximum security but high gas fees for frequent claims. L2s provide sub-cent claim costs and high throughput. | Gas cost per claim vs. liquidity depth and ecosystem integration. | Leadership / DAO |
| **D-02** | **Treasury Multisig Threshold & Signers** | 1. 3-of-5 Gnosis Safe<br>2. 4-of-7 Gnosis Safe<br>3. 5-of-9 Gnosis Safe | Higher thresholds increase Byzantine fault tolerance but increase operational friction for emergency actions. | Geographic diversity, signer availability, and hardware wallet enforcement. | Core Team / Security |
| **D-03** | **Timelock Delay Duration** | 1. 24 Hours<br>2. 48 Hours<br>3. 72 Hours | Longer timelocks give users more time to exit before changes take effect; shorter timelocks enable faster patch deployment. | Balance between user protection and operational agility (48h recommended). | Governance / DAO |
| **D-04** | **Production Revenue & Fee Model** | 1. Secondary NFT royalties (e.g. 2%)<br>2. Application/DEX swap fee share<br>3. Native minting / platform fees | Direct fees provide reliable cashflow; marketplace royalties rely on ERC-2981 marketplace enforcement. | Legal compliance, predictable volume, and platform growth alignment. | Product / Finance |
| **D-05** | **Real Asset Acquisition Route** | 1. Automated on-chain DEX (Uniswap v3 TWAP)<br>2. Off-chain OTC via broker-dealer<br>3. Regulated RWA partner (e.g. Backed/Ondo) | On-chain DEX is decentralized and verifiable; off-chain OTC requires legal counterparty trust and Proof-of-Reserve. | Regulatory compliance for target reward assets and liquidity depth. | Legal / Treasury Ops |
| **D-06** | **Stock-Linked Asset Legal & Custody Model** | 1. Regulated Tokenized Securities (RWA)<br>2. Synthetic Price Exposure (Synthetix-style)<br>3. Stablecoin/Crypto-native only (USDC, WETH) | Real stock tokens require broker-dealer licensing, AML/KYC, and securities law opinions. Stablecoins have lower regulatory friction. | Formal written opinion from qualified securities counsel in key jurisdictions. | General Counsel |
| **D-07** | **Oracle & Price Source Model** | 1. Chainlink Decentralized Oracles<br>2. Uniswap v3 Geometric TWAP<br>3. Pyth Network feeds | Chainlink has battle-tested security; TWAP provides on-chain independence; Pyth offers high-frequency updates. | Asset coverage, update latency, and fallback/stale-price resilience. | Engineering Lead |
| **D-08** | **Max Slippage & Circuit Breaker Limits** | 1. Fixed 0.50% (50 bps)<br>2. Dynamic 0.50% - 1.50% based on depth<br>3. Max 2.00% cap with circuit breaker | Tight slippage causes frequent reverted trades in volatile markets; loose slippage risks MEV sandwich attacks. | Historical liquidity depth of reward tokens. | Treasury / Risk |
| **D-09** | **Production Whitelist of Reward Assets** | 1. Exact 12 stocks from Testnet<br>2. Blue-chip Crypto Assets (BTC, ETH, SOL)<br>3. Yield-bearing Stablecoins (USDG, sUSDe) | Crypto/stablecoins have mature on-chain liquidity; stock RWAs require specialized tokenization rails. | Availability of compliant, liquid on-chain tokens at launch. | Product / Legal |
| **D-10** | **Emergency Security Council Authority** | 1. Pause only (cannot move funds)<br>2. Pause + Parameter adjust<br>3. Automated sentinel-triggered pause | "Pause only" is safest against rogue councils; automated sentinels provide instant exploit mitigation. | Separation of powers (Security Council can pause; only Timelock can unpause/upgrade). | Security / DAO |
| **D-11** | **ERC-6551 TBA Execution Policy** | 1. Unrestricted CALL (`op == 0`)<br>2. Whitelisted destination contracts only<br>3. Value limits per transaction | Unrestricted CALL gives users full ownership sovereignty; whitelisting restricts composability. | Preserving true user ownership of Token Bound Accounts (CALL only recommended). | Product / Security |
| **D-12** | **Production Funder Authorization Policy** | 1. Dedicated automated bot wallet<br>2. Multisig manual execution only<br>3. Hybrid (Bot under capped daily budget) | Automated bot ensures consistent reward stream timing; manual multisig is slower but minimizes key risk. | Daily spending caps enforced on-chain for the automated funder. | DevOps / Treasury |
| **D-13** | **Staged Launch Value Limits (Guarded Launch)** | 1. Cap NFT supply at 500 in Phase 1<br>2. Cap daily reward funding at $5,000<br>3. Full 10,000 supply launch immediately | Staged caps protect user capital during initial mainnet discovery; immediate launch maximizes adoption. | Gradual ramp-up with milestone audits between phases. | Leadership / Risk |

---

## 3. Summary of Known Technical Assumptions

1. **ERC-6551 Registry Availability**: Assumes canonical ERC-6551 Registry is deployed at `0x000000006551c19487814612e58FE06813775758` on the target chain.
2. **EVM Cancun Compatibility**: Assumes target EVM supports Solidity `0.8.24` and `cancun` instructions (e.g. `MCOPY`, `TSTORE` if applicable).
3. **OpenZeppelin V5 Stability**: Assumes OpenZeppelin v5.6.1 contracts behave according to official audits and specification.
