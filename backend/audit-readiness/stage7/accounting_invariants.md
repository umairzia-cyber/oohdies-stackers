# OOHDIES STACKERS — MATHEMATICAL & ACCOUNTING INVARIANTS SPECIFICATION

**Document Version:** 1.0.0  
**Audit Stage:** Stage 7 — Production Architecture & Audit Readiness  
**Target:** Formal Mathematical Proof & Invariant Specification  
**Date:** 2026-08-19  

---

## 1. Core Mathematical Model

The `EarningEngine` computes continuous reward streaming across discrete on-chain blocks using a **Scaled Global Accrual Index** per asset.

### 1.1 Scaled Emission Index Update
For any registered asset $A$, when time advances from $t_{\text{last}}$ to $t_{\text{curr}}$:

$$\Delta t = \min(t_{\text{curr}}, \text{periodFinish}[A]) - \min(t_{\text{last}}, \text{periodFinish}[A])$$

If active weight $W_A > 0$ and $\Delta t > 0$:

$$\Delta I_A = \frac{\Delta t \times \text{rewardRate}[A] \times 10^{36}}{W_A}$$

$$I_A(t_{\text{curr}}) = I_A(t_{\text{last}}) + \Delta I_A$$

Where:
- $\text{rewardRate}[A] = \frac{\text{fundedAmount}}{\text{duration}}$
- $W_A = \sum_{k \in \text{Pickers}(A)} \text{weight}(k)$
- $\text{PRECISION\_FACTOR} = 10^{36}$

---

## 2. Formal Protocol Invariants

### Invariant 1: Vault Solvency Bound
For every registered reward asset $A$, the total claimed amount across all NFTs can never exceed the total amount deposited into the `RewardVault`:

$$\text{totalClaimed}[A] \le \text{totalDeposited}[A], \quad \forall A$$

$$\text{vaultBalance}(A) \ge \text{totalDeposited}[A] - \text{totalClaimed}[A], \quad \forall A$$

### Invariant 2: Multi-Picker Stream Division
If $N$ NFTs with equal weight choose asset $A$, each NFT accrues exactly $\frac{1}{N}$ of the continuous emission stream over the active interval $[t_1, t_2]$:

$$\text{Accrued}_k(A) = \frac{1}{N} \int_{t_1}^{t_2} \text{rewardRate}[A] \, dt$$

### Invariant 3: Zero-Picker Retention (No Emission Loss)
If an asset $A$ is funded but has zero active pickers ($W_A = 0$):
$$\Delta I_A = 0$$
The unallocated tokens remain in the emission pool and the index does not advance. No tokens are burnt or lost; they are retained until pickers activate the asset.

### Invariant 4: Monotonic Accrual & Non-Negativity
For any valid NFT token ID $k$ and asset $A$:
$$\text{getAccruedReward}(k, A) \ge 0, \quad \forall k, A$$
$$\text{Claimable}(k, A, t_2) \ge \text{Claimable}(k, A, t_1), \quad \forall t_2 \ge t_1 \text{ (prior to claim)}$$

### Invariant 5: Collection Q Multiplier
For token $k$ holding Collection Q NFT:
$$\text{weight}(k) = \text{BASE\_WEIGHT} \times \left(1 + \frac{\text{collectionQMultiplierBps}}{10000}\right) = 10000 \times \left(1 + \frac{20000}{10000}\right) = 30000 \text{ (or 2.0x weight)}$$

### Invariant 6: BANANA Burn Conservation
For every successful NFT activation:
$$\Delta \text{totalSupply}_{\text{BANANA}} = -100 \times 10^{18}$$
For any failed or reverted activation:
$$\Delta \text{totalSupply}_{\text{BANANA}} = 0$$
