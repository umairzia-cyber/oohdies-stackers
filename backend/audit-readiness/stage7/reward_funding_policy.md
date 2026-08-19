# OOHDIES STACKERS — REWARD FUNDING & EMISSION POLICY

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** RewardVault & EarningEngine Operational Policy  
**Date:** 2026-08-19  

---

## 1. Reward Funding Architecture & Permissions

### 1.1 Funding Roles & Authorization
The protocol separates reward distribution into two strictly synchronized operations:
1. **Mathematical Emission Scheduling** (`EarningEngine.fundReward`): Defines reward emission rate ($r = \frac{\text{amount}}{\text{duration}}$) and duration.
2. **Physical Token Custody Funding** (`RewardVault.depositReward`): Deposits the actual ERC-20 tokens into the vault to back claim obligations.

```
+─────────────────────────────────────────────────────────────────────────────────+
|                         REWARD FUNDING & EMISSIONS PIPELINE                     |
+─────────────────────────────────────────────────────────────────────────────────+

                 [Authorized Treasury Funder Multisig / Bot]
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          │ (1. Physical Token Transfer)                        │ (2. Emission Scheduling)
          ▼                                                     ▼
 [RewardVault.depositReward()]                         [EarningEngine.fundReward()]
  - Receives ERC-20 Tokens                              - Checks registered asset
  - Updates totalDeposited[asset]                       - Updates rewardRate & periodFinish
  - Emits RewardDeposited event                         - Emits RewardFunded event
          │                                                     │
          └──────────────────────────┬──────────────────────────┘
                                     │
                                     ▼
                      [Active NFT Pickers Claim Rewards]
                      - Vault checks vaultBalance >= claimable
                      - Vault queries Engine.deductClaimableReward
                      - Vault transfers tokens directly to TBA
```

### 1.2 Access Control Rules
- **`EarningEngine.fundReward`**: Strictly **permissioned**. Callable only by registered funder addresses (`isFunder[msg.sender] == true`), controlled by the protocol owner/multisig via `setFunder(address, bool)`.
- **`RewardVault.depositReward`**: **Permissionless** by design, allowing donations or treasury sweeps, with safety guards (`whenNotPaused`, `nonReentrant`, `ZeroAddressNotAllowed`, `ZeroAmountNotAllowed`).
- **`RewardVault.claimReward`**: **Permissionless** execution; claimed assets are delivered strictly to `accountOf(tokenId)` (the NFT's Token Bound Account), making frontrunning or interception mathematically impossible.

---

## 2. Emission Mechanics & Mathematical Invariants

### 2.1 Emission Period & Rate Calculation
When funding an asset for `amount` over `duration`:
$$\text{rewardRate} = \frac{\text{amount} \times 10^{36}}{\text{duration}}$$
- **Active Period Overlap**: If funding occurs while a previous period is still active, remaining unallocated rewards are added to the new amount, and a new unified `rewardRate` is computed over the new duration.
- **Zero Duration**: Calling `fundReward` with `duration == 0` strictly reverts (`ZeroDurationNotAllowed`).
- **Precision**: Calculations leverage `PRECISION_FACTOR = 1e36` to ensure sub-wei precision across tokens with 6, 8, or 18 decimals without rounding loss.

### 2.2 Zero-Picker Asset Invariant
- If an asset is funded with $N$ tokens over duration $T$, but **no active NFTs have chosen that asset** (`activeCountForAsset[asset] == 0`), the emission index does **not** advance.
- **Emission Holding Guarantee**: Unclaimed emission is held in the contract rather than lost or diluted, becoming available when pickers subsequently activate the asset.

### 2.3 Underfunded Vault Backstop
- If `RewardVault` holds fewer physical tokens than the accrued claimable amount calculated by `EarningEngine` (e.g. Due to an operational delay in physical deposit), `RewardVault.claimReward` **reverts atomically** with:
  ```solidity
  revert InsufficientVaultBalance(asset, claimableAmount, vaultBalance);
  ```
- **State Integrity**: No partial or truncated balance transfers occur; the user's claimable entitlement in `EarningEngine` remains fully intact and unconsumed until the vault is funded.

---

## 3. Emission Expiry, Unclaimed Assets & Operational Limits

### 3.1 Emission Expiry
- When `block.timestamp >= periodFinish[asset]`, reward accrual halts for that asset until a new funding cycle is scheduled.
- Any rewards accrued prior to expiry remain permanently claimable by qualifying NFTs; they never expire or forfeit.

### 3.2 Treatment of Undistributed / Unclaimed Assets
- Tokens deposited in `RewardVault` can **never be swept or withdrawn** by protocol admins through standard calls.
- Tokens in the vault are reserved exclusively for NFT claims via `claimReward`.

### 3.3 Event Telemetry & Audit Logs
Every funding operation must emit:
```solidity
event RewardFunded(address indexed asset, uint256 amount, uint256 duration, uint256 periodFinish);
event RewardDeposited(address indexed asset, address indexed depositor, uint256 actualAmount);
event RewardClaimed(uint256 indexed tokenId, address indexed asset, address indexed recipient, uint256 amount);
```
