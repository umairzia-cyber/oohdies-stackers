# OOHDIES STACKERS — STAGE 7A KNOWN LIMITATIONS & AUDIT BOUNDARIES

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7A — Release Candidate Acceptance  

---

## 1. Verified Currently Implemented Architecture
- Core Oohdies NFT ERC-721 ownership and transfer deactivation hooks.
- BANANA token burning (100 BANANA per activation).
- Selection validation of exactly 3 distinct assets from the 12-asset whitelist.
- EarningEngine high-precision mathematical reward streaming and Collection Q multiplier (2.0x).
- RewardVault custody routing directly into sovereign ERC-6551 Token Bound Accounts.
- Full dynamic asset transfer semantics (assets follow the NFT upon sale).
- Comprehensive adversarial resistance against 97+ attack vectors and 1,750+ fuzz sequences.

---

## 2. Production Components Not Yet Implemented
The following components are outside the current smart contract codebase and must be implemented or engaged prior to mainnet launch:
1. **Commercial On-Chain DEX Routing**: Production Uniswap v3 / TWAP routing for real asset buybacks.
2. **Real-World Equity Rails**: Regulated broker-dealer custody and Proof-of-Reserve oracles for real stock RWAs.
3. **Production Governance Multisig**: Gnosis Safe (3-of-5) and 48-hour TimelockController deployment ceremony.
4. **Independent External Audit**: Commercial audit engagement and remediation by a top-tier security firm.
5. **Formal Legal Signoff**: Written securities counsel opinion on reward token categorization.
