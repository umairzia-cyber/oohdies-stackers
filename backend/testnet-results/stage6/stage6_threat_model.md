# OOHDIES STACKERS — STAGE 6 THREAT MODEL

**Date:** 2026-08-19
**Network:** Robinhood Chain Testnet (Chain ID: 46630 / 0xb626)
**Scope:** All deployed protocol contracts + testnet simulation contracts

---

## 1. Protected Assets

| Asset | Location | Risk |
|---|---|---|
| ERC-20 reward tokens (AAPLx, USDG, GMEx, etc.) | RewardVault, EarningEngine, TBAs | Theft, drain, redirect |
| BANANA tokens | User wallets (burned on activation) | Unauthorized burn, burn bypass |
| REV (MockRevenueToken) | TestnetRevenueSimulator, TestnetPhysicalLiquidityPool | Theft, double-spend, replay |
| NFT ownership (OohdiesNFT) | ERC-721 holders | Unauthorized transfer |
| TBA balances (OohdiesAccount) | Per-token-id proxy accounts | Unauthorized withdrawal, hijack |
| Accrued reward accounting | EarningEngine mappings | Corruption, inflation, theft |
| Activation state | ActivationController mappings | Bypass, unauthorized set |
| Global reward index | EarningEngine.rewardAssets | Index manipulation, dilution |
| Pool liquidity reserves | TestnetPhysicalLiquidityPool.rewardReserves | Theft, drain |

---

## 2. Trusted Roles

| Role | Holder | Contract | Privileges |
|---|---|---|---|
| `owner` (Ownable) | Deployer | ActivationController | setActivationCost, setEarningEngine, setRequiredPicks, pause/unpause, deactivateOnTransfer |
| `owner` (Ownable) | Deployer | EarningEngine | registerRewardAsset, setFunder, setRewardVault, setCollectionQ, pause/unpause |
| `isFunder[addr]` | Granted by owner | EarningEngine | fundReward (pull tokens from funder, set emission rate) |
| `owner` (Ownable) | Deployer | RewardVault | pause/unpause |
| `owner` (Ownable) | Deployer | OohdiesNFT | mintBatch, mint (onlyOwner for batch), setMintPrice, setEarningEngine, setActivationController, pause/unpause, withdraw |
| `owner` (Ownable) | Deployer | BananaToken | pause/unpause |
| `owner` (Ownable) | Deployer | TestnetRevenueSimulator | setConversionRate, acquireRewardAsset, settleRevenueWithPool, fundRewardVault, depositToRewardVault, withdrawRevenue |
| `owner` (Ownable) | Deployer | TestnetPhysicalLiquidityPool | setAssetRate, withdrawRevenue, withdrawRewardLiquidity, approveRewardSpender |
| NFT owner (dynamic) | Current ownerOf(tokenId) | OohdiesAccount | execute (CALL only) |

---

## 3. Untrusted Callers

| Caller | Capability | Must Be Rejected From |
|---|---|---|
| Any EOA (Alice, Bob, Attacker) | Can call any public/external function | All owner-only functions, funder-only functions, TBA execute (for non-owners) |
| Malicious contract | Can attempt reentrancy, return false, fee-on-transfer | All token transfer paths, TBA execute |
| Previous NFT owner | Lost control after transfer | TBA execute, activation of transferred NFT |
| Approved operator (ERC-721) | Can transfer NFT | Should NOT control TBA after ownership change |

---

## 4. External Call Boundaries

### ActivationController
- **L125**: `bananaToken.burnFrom(msg.sender, cost)` — External call to BANANA. Protected by `nonReentrant`. If burnFrom fails, entire tx reverts.
- **L127**: `engine.onNftActivation(tokenId, assets)` — Calls EarningEngine. Protected by `nonReentrant`.
- **L141**: `oohdiesNFT.ownerOf(tokenId)` — View call in try/catch inside deactivateOnTransfer.

### EarningEngine
- **L278**: `IERC20(asset).safeTransferFrom(msg.sender, address(this), amount)` — In `fundReward`, protected by `nonReentrant + onlyFunder`.
- **L496**: `deductClaimableReward` — Called by RewardVault. No external calls within, but updates state.

### RewardVault
- **L91**: `IERC20(asset).safeTransferFrom(msg.sender, address(this), amount)` — In `depositReward`, protected by `nonReentrant`.
- **L109**: `earningEngine.deductClaimableReward(tokenId, asset)` — Cross-contract state mutation in `claimReward`.
- **L118**: `IERC20(asset).safeTransfer(recipient, claimableAmount)` — Transfer to TBA after state update. CEI pattern followed.

### OohdiesAccount
- **L46**: `to.call{value: value}(data)` — **ARBITRARY EXTERNAL CALL** gated only by `_isValidSigner(msg.sender)`. This is the primary attack surface. No reentrancy guard.
- **L70**: `IERC721(tokenContract).ownerOf(tokenId)` — View call for ownership check.

### OohdiesNFT._update (Transfer Hook)
- **L124**: `IEarningEngineHook(earningEngine).onNftTransfer(...)` — try/catch, failure is swallowed.
- **L130**: `IActivationControllerHook(activationController).deactivateOnTransfer(...)` — try/catch, failure is swallowed.

### TestnetRevenueSimulator
- **L100**: `revenueToken.safeTransferFrom(msg.sender, ...)` — In generateFee, `nonReentrant`.
- **L181**: `IERC20(asset).safeTransferFrom(rewardSource, ...)` — In acquireRewardAsset, `onlyOwner + nonReentrant`.
- **L206-213**: `revenueToken.forceApprove + pool.swapRevenueForReward` — In settleRevenueWithPool, `onlyOwner + nonReentrant`.

### TestnetPhysicalLiquidityPool
- **L97**: `IERC20(asset).safeTransferFrom(msg.sender, ...)` — In depositRewardLiquidity, `nonReentrant`.
- **L150**: `revenueToken.safeTransferFrom(msg.sender, ...)` — In swapRevenueForReward, `nonReentrant`.
- **L153**: `IERC20(asset).safeTransfer(recipient, ...)` — Disburse reward, `nonReentrant`.

---

## 5. Privilege-Escalation Paths

| Path | Risk | Mitigation |
|---|---|---|
| Attacker gains owner role | Full protocol takeover | Ownable — single owner, no transferOwnership called externally |
| Attacker becomes funder | Can set arbitrary emission rates | setFunder is onlyOwner |
| Attacker calls onNftActivation directly | Bypass BANANA burn + pick validation | Gated by `msg.sender == address(activationController)` |
| Attacker calls onNftTransfer directly | Unauthorized pick release | Gated by `msg.sender == address(oohdiesNFT)` |
| Attacker calls deductClaimableReward directly | Drain accrued rewards | Gated by `msg.sender == rewardVault` |
| Attacker calls deactivateOnTransfer directly | Reset activation without transfer | Gated by `msg.sender == nft || msg.sender == owner()` |
| TBA execute → call privileged function | NFT owner could call owner-only via TBA | TBA address is not owner of any contract |
| Stale approval after NFT transfer | Operator/approved addr controls TBA | OohdiesAccount checks live ownerOf, not approvals |

---

## 6. ERC-6551-Specific Risks

| Risk | Analysis | Mitigation in OohdiesAccount |
|---|---|---|
| Ownership cycle (NFT sent to its own TBA) | Would freeze account permanently | `onERC721Received` rejects the bound NFT (L97-110). `_isValidSigner` reverts if `owner() == address(this)` (L123). |
| Delegatecall from execute | Could overwrite TBA storage | `execute` requires `operation == 0` (CALL only), reverts on delegatecall (L39). |
| Reentrancy in execute | No ReentrancyGuard on execute | `_state` increments but no lock. The arbitrary call target could reenter `execute`. **However**, reentrant `execute` would succeed IF the same signer calls again — but since it's an external call, the original caller is still `msg.sender`. A malicious target contract calling back would have `msg.sender == maliciousContract`, not the NFT owner, so `_isValidSigner` would fail. |
| Cross-chain replay | TBA bound to specific chainId | `owner()` returns `address(0)` if `chainId != block.chainid` (L68). |
| Account creation replay/idempotency | Multiple createAccount calls | Registry uses CREATE2 — second call returns existing address (idempotent). |
| Plain transferFrom bypasses onERC721Received | NFT could be sent to TBA without hook | `_isValidSigner` catches this: if `owner() == address(this)`, reverts `OwnershipCycle` (L123). |

---

## 7. Reward-Accounting Risks

| Risk | Vector | Mitigation |
|---|---|---|
| Index dilution on activation | New picker joins without updating global index first | `onNftActivation` calls `_updateGlobalIndex(asset)` BEFORE incrementing `activeWeightForAsset` (L394-399). |
| Double-claim | Call claimReward twice | `deductClaimableReward` zeros `accruedRewards[tokenId][asset]` before returning (L504). |
| Cross-NFT claim | Claim NFT A's rewards using NFT B | `deductClaimableReward` is keyed by tokenId. RewardVault sends to `accountOf(tokenId)`. |
| Claim unselected asset | Claim asset NFT didn't pick | `_updateRewardForTokenAsset` checks `hasChosenAsset[tokenId][asset]` (L327). Returns 0 accrual. |
| Claim after transfer | Previous owner claims after losing NFT | Transfer releases picks (`_releaseChosenAssets`), banks accrued rewards, but claimReward sends to `accountOf(tokenId)` which is controlled by NEW owner. |
| Reward index overflow | PRECISION_FACTOR = 1e36, large time * rate | Would require astronomically large values. Not practical. |

---

## 8. Revenue / Pool Risks

| Risk | Vector | Mitigation |
|---|---|---|
| Conversion replay | Convert same REV twice | `unconvertedRevenue = totalCollected - totalConverted`. Converting increases totalConverted. |
| Overspend | Convert more than collected | `InsufficientUnconvertedRevenue` check (L157-159, L199-201). |
| Pool drain | Swap more than reserves | `InsufficientPoolLiquidity` check (L138-140). |
| Rounding exploitation | 6-vs-18 decimal mismatch | Decimal scaling in both simulator and pool. Potential dust, not exploitable for material gain. |
| Direct token send to pool | Bypass reserve accounting | `rewardReserves` is only incremented in `depositRewardLiquidity`. Direct sends inflate physical balance but not reserves — cannot be withdrawn via `withdrawRewardLiquidity`. |

---

## 9. Assumptions

1. OpenZeppelin v5 `SafeERC20`, `Ownable`, `Pausable`, `ReentrancyGuard` are correct and secure.
2. The Solidity compiler (0.8.24) prevents integer overflow/underflow.
3. The ERC-6551 Registry is the canonical implementation and is correct.
4. Only the deployer EOA holds the `owner` role on all contracts.
5. BananaToken's `burnFrom` follows standard ERC20Burnable behavior.
6. OohdiesNFT._update hook failures are swallowed — `releaseIfInactive` exists as a repair mechanism.

---

## 10. Out-of-Scope Items

| Item | Reason |
|---|---|
| Mainnet deployment security | This is testnet-only verification |
| Front-running / MEV | Testnet only, no real economic incentive |
| Gas optimization | Not a security concern |
| Formal verification (Certora, etc.) | Requires specialized tooling beyond this scope |
| Oracle manipulation | No oracles in the protocol |
| Flash loan attacks | No flash loan integration |
| Governance attacks | No governance mechanism |
| Frontend security (XSS, CSRF) | Frontend is out of scope per constraints |
