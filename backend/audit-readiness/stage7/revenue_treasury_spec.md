# OOHDIES STACKERS — PRODUCTION REVENUE & TREASURY SPECIFICATION

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Production Design & Specification  
**Date:** 2026-08-19  

---

## 1. Production Revenue Architecture

### 1.1 Fee Ingestion & Revenue Sources
The production Oohdies Stackers protocol generates economic value through defined on-chain user actions. Rather than vague "taxes," revenue is derived from explicit protocol interactions:

1. **NFT Secondary Market Royalties / Platform Protocol Fees**:
   - A configurable protocol fee percentage (e.g., 0.5% – 2.5%) accrued upon marketplace trades or native swap activity.
2. **BANANA Token Utility & Ecosystem Fees**:
   - Token burns for activation (100 BANANA permanently removed from circulation) and platform service micro-fees.
3. **Application / Platform Transaction Volume**:
   - Trading, staking, or liquidity provision fees generated across platform dApps.

### 1.2 Collector Contract & Settlement Flow
```
[User Economic Action]
        │ (Native ETH / USDC / USDT / Target Fee Tokens)
        ▼
[RevenueCollector Contract] ─── (Automated Sweeps / Threshold Limits)
        │
        ▼
[Protocol Treasury Multisig (Gnosis Safe + Timelock)]
        │
        ▼ (Authorized Acquisition Execution)
[Reward Funding Route -> RewardVault]
```

### 1.3 Fee Configuration & Governance Parameters
- **Allowable Collection Tokens**: Standard ERC-20 stablecoins (e.g. USDC, USDT), wrapped native assets (WETH), or native network currency. Unapproved arbitrary tokens are automatically rejected or forwarded to an isolation buffer.
- **Configurable vs. Fixed**: Base fees are parameter-controlled by governance, subject to strict immutable on-chain caps.
- **Maximum Fee Cap**: Hardcoded immutable maximum of **5.00% (500 bps)** to mathematically guarantee users against malicious fee extraction.
- **Emergency Disable**: A dedicated `pause()` function accessible by the emergency security multisig immediately halts fee collection without freezing user funds.
- **Transparency & Telemetry**: Every fee receipt must emit an indexed on-chain event:
  ```solidity
  event ProtocolFeeCollected(
      address indexed payer,
      address indexed feeToken,
      uint256 amount,
      bytes32 indexed activityId,
      uint256 timestamp
  );
  ```

---

## 2. Production Treasury Custody

### 2.1 Treasury Ownership & Governance Model
The Treasury holds all unallocated protocol revenue before approved asset acquisitions and distributions.

| Component | Target Specification | Open Decision / Alternatives |
| :--- | :--- | :--- |
| **Primary Custody** | Multi-Signature Smart Contract (Gnosis Safe) | 3-of-5 or 4-of-7 M-of-N threshold |
| **Execution Delay** | OpenZeppelin `TimelockController` (24h – 48h delay) | Configurable delay with emergency bypass for pause only |
| **Separation of Duties** | Admin Multisig vs. Operations/Funder Role vs. Security Council | Separate key management for routine funding vs. admin upgrades |
| **Hot vs. Cold Policy** | High-value reserves in Cold Multisig; routine operational funding in capped Hot Wallet | Max daily funding limit enforced by smart contract |

### 2.2 Threshold & Signer Requirements
- **Threshold**: Minimum **3-of-5** or **4-of-7** independent keyholders.
- **Signer Diversity**: Signers must be geographically distributed across distinct operational and security stakeholders.
- **Hardware Security**: All multisig signers must utilize hardware security modules (HSMs) or hardware wallets (e.g. Ledger / Trezor).

### 2.3 Limits & Circuit Breakers
1. **Per-Transaction Spending Limit**: No single treasury transaction may exceed a predefined cap (e.g., $100,000 equivalent) without entering a 48-hour timelock review.
2. **Daily Rolling Velocity Limit**: Rolling 24-hour acquisition budget enforced by an on-chain rate-limiter contract.
3. **Emergency Circuit Breaker**: If market anomalies, oracle discrepancies, or protocol exploits are detected, the Security Council can invoke `freezeTreasury()` instantaneously to prevent fund drainage.

### 2.4 Signer Rotation & Key Management
- **Quarterly Audit & Rotation**: Keyholder activity and key integrity are reviewed quarterly.
- **Compromise Procedure**: Immediate threshold reduction or key replacement via the remaining majority of non-compromised signers through pre-signed emergency migration channels.

---

## 3. Legal & Compliance Governance Note

> [!IMPORTANT]
> **Legal & Regulatory Disclaimer**:
> Treasury management, revenue collection, and token distribution models may be subject to securities, money transmission, tax, and commodities regulations in various jurisdictions (e.g., SEC, CFTC, FinCEN in the US; MiCA in the EU).
> 
> The project **must engage specialist regulatory and legal counsel** to review:
> 1. Classification of revenue tokens and buyback mechanisms.
> 2. Corporate entity structuring for treasury custody (e.g. Cayman Foundation / Swiss Association).
> 3. KYC/AML obligations for high-volume participants, if applicable.
