# OOHDIES STACKERS — AUTHORITATIVE VS. TESTNET-ONLY INFRASTRUCTURE

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target Git Commit:** \`cf31049563cb96e0a7d99f0d92377736ca8b38d1\`  
**Date:** 2026-08-19  

---

## 1. Executive Summary & Separation Principle

A critical objective of Stage 7 audit readiness is to establish a strict, unambiguous boundary between:
1. **The Authoritative Protocol Core**: Contracts intended for production mainnet deployment and external audit scrutiny.
2. **The Testnet-Only Simulation & Hostile Testing Harness**: Mock contracts created solely to simulate economic flows, execute physical two-way settlements on testnet, and probe edge-case failure modes during Stages 1–6.

> [!WARNING]
> Under no circumstances must any component of the Testnet-Only layer be deployed to mainnet, treated as production treasury infrastructure, or represented as a real custodial stock settlement system.

---

## 2. Comprehensive Component Taxonomy

```
+-----------------------------------------------------------------------------------+
|                           OOHDIES STACKERS PROTOCOL                               |
+-------------------------------------------------+---------------------------------+
|          A. AUTHORITATIVE PROTOCOL CORE         |    B. TESTNET-ONLY SIMULATOR    |
|             (In Scope for Audit)                |     (Out of Scope for Audit)    |
+-------------------------------------------------+---------------------------------+
|  1. BananaToken.sol                             |  1. MockRevenueToken.sol        |
|  2. OohdiesNFT.sol                              |  2. TestnetRevenueSimulator.sol |
|  3. ActivationController.sol                    |  3. TestnetPhysicalLiquidity... |
|  4. EarningEngine.sol                           |  4. MaliciousTokens.sol         |
|  5. RewardVault.sol                             |  5. MockRewardToken.sol         |
|  6. OohdiesAccount.sol (ERC-6551 TBA)           |  6. MockERC1155.sol             |
|  7. ERC6551Registry.sol (or canonical registry) |                                 |
|  8. MockCollectionQ.sol (Staking Multiplier)    |                                 |
+-------------------------------------------------+---------------------------------+
```

---

## 3. Section A: Authoritative Protocol Core (Audit Target)

These contracts constitute the immutable on-chain architecture of Oohdies Stackers:

### 1. `BananaToken.sol`
- **Purpose**: Burnable utility token (ERC-20).
- **Core Functionality**: Minted by owner; burned when an NFT activates its stock picks via `ActivationController`.
- **Production Role**: Fixed economic barrier (100 BANANA) required for reward accrual activation.

### 2. `OohdiesNFT.sol`
- **Purpose**: Core protocol ERC-721 collection.
- **Core Functionality**: ERC-721 standard with `_totalMinted` counter, mint price, transfer hooks (`onNftTransfer`), and emergency pause.
- **Production Role**: Root identity asset. Each NFT owns a distinct ERC-6551 Token Bound Account.

### 3. `ActivationController.sol`
- **Purpose**: Gating contract for stock pick activation.
- **Core Functionality**: Validates user owns the NFT, burns 100 BANANA tokens, enforces exactly 3 distinct approved stock picks, and notifies `EarningEngine`.
- **Production Role**: Manages activation lifecycle and enforces deactivation upon NFT transfer.

### 4. `EarningEngine.sol`
- **Purpose**: High-precision reward accounting engine.
- **Core Functionality**: Scaled emission index tracking (`PRECISION_FACTOR = 1e36`), stream division among active pickers, Collection Q multiplier integration, and per-token accrual settlement.
- **Production Role**: Authoritative mathematical ledger of reward accrual. Holds zero custody of physical reward tokens.

### 5. `RewardVault.sol`
- **Purpose**: Custodial reward token vault and permissionless claim processor.
- **Core Functionality**: Safely deposits approved reward assets, queries `EarningEngine.deductClaimableReward`, and transfers claimed tokens directly to the NFT's ERC-6551 account (`accountOf(tokenId)`).
- **Production Role**: Physical token holding vault for all distributed reward assets.

### 6. `OohdiesAccount.sol`
- **Purpose**: ERC-6551 Token Bound Account implementation.
- **Core Functionality**: Pure dynamic ownership resolution (`ownerOf(tokenId)` via live NFT call), CALL-only execution (`operation == 0`), signature verification (`IERC1271`), and ownership cycle prevention (`OwnershipCycle`).
- **Production Role**: Sovereign smart account tied to each NFT; holds accrued rewards and user-transferred assets.

### 7. `ERC6551Registry.sol`
- **Purpose**: Canonical deployment registry for ERC-6551 accounts.
- **Production Role**: Standard CREATE2 account deployment across EVM chains at `0x000000006551c19487814612e58FE06813775758`.

### 8. `MockCollectionQ.sol`
- **Purpose**: Secondary multiplier NFT collection interface.
- **Production Role**: Holding Collection Q NFTs doubles reward weight (`20000 bps = 2.0x`) in the `EarningEngine`.

---

## 4. Section B: Testnet-Only Infrastructure (Out of Audit Scope)

These contracts were engineered solely for testnet verification and must **NEVER** be deployed to production:

### 1. `MockRevenueToken.sol` (`REV`)
- **Deployed Address**: `0xd20A8A27534F5ebdf0B36ACe3e2f370d68B8AFCA`
- **Purpose**: Simulates protocol user fees on testnet.
- **Production Replacement**: Real protocol fee collection mechanisms (e.g. DEX trading fees, native gas fees, or platform fees).

### 2. `TestnetRevenueSimulator.sol`
- **Deployed Address**: `0xc5D48E1667c0BdE0FA02B75A6d245FD1D8e49A2D`
- **Purpose**: Mock contract simulating user activity fees and triggering automated acquisitions.
- **Production Replacement**: Off-chain or on-chain Treasury multisig / automated buyback routing engine.

### 3. `TestnetPhysicalLiquidityPool.sol`
- **Deployed Address**: `0x1e20451f6F5a2884a66416682928eFb478527539`
- **Purpose**: Two-way liquidity pool that swaps mock REV for mock stock assets (AAPLx, USDG, etc.) to prove physical settlement on testnet.
- **Production Replacement**: Regulated broker-dealer custody, authorized crypto-to-fiat routing, decentralized liquidity pools (Uniswap v3), or real-world asset (RWA) tokenization partners.

### 4. `MaliciousTokens.sol` (`ReentrantERC20`, `FalseReturnERC20`, `FeeOnTransferERC20`, `RevertingERC20`, `MaliciousReceiver`, `MaliciousTBATarget`, `AttackCaller`)
- **Purpose**: Hostile attack test harnesses used in Stage 6 to probe reentrancy and ERC-20 divergence.
- **Production Replacement**: None (Testing harness only).

### 5. `MockRewardToken.sol` (12 Testnet Stock Assets)
- **Purpose**: Deployed ERC-20 tokens simulating 12 stocks (AAPLx, MSFTx, NVDAx, GOOGLx, AMZNx, TSLAx, METAx, NFLXx, PLTRx, COINx, GMEx, USDG).
- **Production Replacement**: Real ERC-20 reward assets or tokenized real-world assets with legally compliant custody.

---

## 5. Summary Matrix for Auditors

| Contract File | Production Target | Audit Scope | Testnet Address (46630) |
| :--- | :--- | :--- | :--- |
| `BananaToken.sol` | Authoritative | **IN SCOPE** | `0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1` |
| `OohdiesNFT.sol` | Authoritative | **IN SCOPE** | `0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A` |
| `ActivationController.sol` | Authoritative | **IN SCOPE** | `0x739536FD3fCa15f0ef19c32FCA03fE6510650eD7` |
| `EarningEngine.sol` | Authoritative | **IN SCOPE** | `0x623283c4b68d91ffCea057E6dd6084824E269Fa1` |
| `RewardVault.sol` | Authoritative | **IN SCOPE** | `0x2FB7E3F8e0DB58eBa1B38B79Dcfd54DA99cf3A8C` |
| `OohdiesAccount.sol` | Authoritative | **IN SCOPE** | `0xFEd0429452592011C4e4c6C92560Bc2DB558CbE8` |
| `ERC6551Registry.sol` | Authoritative | **IN SCOPE** | `0x000000006551c19487814612e58FE06813775758` |
| `MockCollectionQ.sol` | Authoritative | **IN SCOPE** | `0x65eAf7036fa72E8e4094Dd9f06Dcb6A43c530AD7` |
| `MockRevenueToken.sol` | Testnet-Only | **OUT OF SCOPE** | `0xd20A8A27534F5ebdf0B36ACe3e2f370d68B8AFCA` |
| `TestnetRevenueSimulator.sol` | Testnet-Only | **OUT OF SCOPE** | `0xc5D48E1667c0BdE0FA02B75A6d245FD1D8e49A2D` |
| `TestnetPhysicalLiquidityPool.sol` | Testnet-Only | **OUT OF SCOPE** | `0x1e20451f6F5a2884a66416682928eFb478527539` |
| `MaliciousTokens.sol` | Testnet-Only | **OUT OF SCOPE** | Local Hardhat only |
| `MockRewardToken.sol` | Testnet-Only | **OUT OF SCOPE** | 12 deployed testnet addresses |
