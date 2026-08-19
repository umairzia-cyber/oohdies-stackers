# ERC-6551 Token Bound Account Attack Surface Verification

## 1. Threat Model & Architecture
The Oohdies protocol binds each NFT to an ERC-6551 Token Bound Account (TBA) deployed via canonical registry `0x000000006551c19487814612e58FE06813775758`.

### Key Defenses Verified:
1. **Dynamic Ownership Resolution**: The TBA reads `ownerOf(tokenId)` dynamically from `OohdiesNFT`. No state variable stores the owner, eliminating desynchronization attacks.
2. **Operation 0 (CALL Only)**: The TBA's `execute` implementation strictly forbids `DELEGATECALL` (operation 1), `CREATE` (operation 2), and `CREATE2` (operation 3).
3. **Reentrancy Protection**: Calling external contracts from TBA cannot re-enter protocol contracts or drain unrelated assets.
4. **Ownership Cycle Prevention**: The `onERC721Received` hook and `_isValidSigner` detect and revert any attempt to send the controlling NFT into its own TBA, preventing irrecoverable asset loss.
5. **Permissionless Reward Routing**: The `RewardVault` routes claims directly to `accountOf(tokenId)` regardless of caller, making front-running claims harmless.

## 2. Testnet & Local Attack Verification Matrix
- **TBA-01 (Unauthorized Execute)**: PASSED (Reverts with `NotAuthorized`)
- **TBA-02 (Delegatecall Attempt)**: PASSED (Reverts with `InvalidOperation` / `NotAuthorized`)
- **TBA-03 (Signature Validation)**: PASSED (`isValidSigner` returns `0x00000000` for attacker)
- **TBA-04 (Ownership Cycle)**: PASSED (Reverts with `OwnershipCycle`)
- **TBA-05 (Asset Persistence)**: PASSED (Tokens in TBA transfer ownership seamlessly on NFT sale)
