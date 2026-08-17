pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

interface IActivationControllerView {
    function isActivated(uint256 tokenId) external view returns (bool);
    function getActivatedAt(uint256 tokenId) external view returns (uint256);
    function totalActivated() external view returns (uint256);
}

contract EarningEngine is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION_FACTOR = 1e36;
    uint256 public constant BASE_WEIGHT = 10000; // 1.0x in basis points

    struct RewardAssetInfo {
        bool isRegistered;
        uint8 decimals;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 globalRewardIndex;
        uint256 periodFinish;
        uint256 totalFunded;
    }

    IActivationControllerView public immutable activationController;

    IERC721 public immutable oohdiesNFT;

    address public collectionQ;
    uint256 public collectionQMultiplierBps = 20000; // Default 2.0x (20,000 bps)

    address[] public registeredRewardAssets;

    mapping(address => RewardAssetInfo) public rewardAssets;

    mapping(address => bool) public isFunder;

    mapping(uint256 => mapping(address => uint256)) public userRewardIndex;

    mapping(uint256 => mapping(address => uint256)) public accruedRewards;

    mapping(uint256 => mapping(address => bool)) public isUserIndexInitialized;

    mapping(uint256 => address[]) private _chosenAssets;

    mapping(uint256 => mapping(address => bool)) public hasChosenAsset;

    /// @notice Total active weight per asset stream (sum of active pickers' weights).
    mapping(address => uint256) public activeWeightForAsset;

    /// @notice Number of pickers per asset (retained for backward-compatible views/telemetry).
    mapping(address => uint256) public activeCountForAsset;

    /// @notice Stored active weight for an activated NFT.
    mapping(uint256 => uint256) public nftWeight;

    address public rewardVault;

    event RewardAssetRegistered(address indexed asset, uint8 decimals);
    event RewardFunded(
        address indexed asset,
        address indexed funder,
        uint256 amount,
        uint256 duration,
        uint256 rewardRate,
        uint256 periodFinish
    );
    event FunderStatusUpdated(address indexed funder, bool isFunder);
    event RewardUpdated(uint256 indexed tokenId, address indexed asset, uint256 accruedAmount, uint256 userIndex);
    event NFTTransferSettled(uint256 indexed tokenId, address indexed from, address indexed to);
    event RewardVaultUpdated(address indexed oldVault, address indexed newVault);
    event AssetsChosen(uint256 indexed tokenId, address[] assets);
    event AssetsReleased(uint256 indexed tokenId, address[] assets);
    event CollectionQConfigUpdated(address indexed collectionQ, uint256 multiplierBps);
    event CollectionQWeightUpdated(uint256 indexed tokenId, uint256 oldWeight, uint256 newWeight);

    error AssetNotRegistered(address asset);
    error AssetAlreadyRegistered(address asset);
    error DuplicateAssetChoice(address asset);
    error StillActivated(uint256 tokenId);
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error ZeroDurationNotAllowed();
    error UnauthorizedFunder();
    error OnlyNFTContractAllowed();
    error OnlyRewardVaultAllowed();
    error OnlyActivationControllerAllowed();
    error InvalidMultiplier();

    modifier onlyFunder() {
        if (!isFunder[msg.sender] && msg.sender != owner()) revert UnauthorizedFunder();
        _;
    }

    constructor(
        address _activationController,
        address _oohdiesNFT,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_activationController == address(0)) revert ZeroAddressNotAllowed();
        if (_oohdiesNFT == address(0)) revert ZeroAddressNotAllowed();

        activationController = IActivationControllerView(_activationController);
        oohdiesNFT = IERC721(_oohdiesNFT);
    }

    function setCollectionQ(address _collectionQ, uint256 _multiplierBps) external onlyOwner {
        if (_multiplierBps < BASE_WEIGHT && _multiplierBps != 0) revert InvalidMultiplier();
        collectionQ = _collectionQ;
        collectionQMultiplierBps = _multiplierBps > 0 ? _multiplierBps : BASE_WEIGHT;
        emit CollectionQConfigUpdated(_collectionQ, collectionQMultiplierBps);
    }

    function getWeight(uint256 tokenId) public view returns (uint256) {
        if (collectionQ == address(0)) return BASE_WEIGHT;
        address holder = address(0);
        try oohdiesNFT.ownerOf(tokenId) returns (address o) {
            holder = o;
        } catch {
            return BASE_WEIGHT;
        }
        if (holder == address(0)) return BASE_WEIGHT;

        try IERC721(collectionQ).balanceOf(holder) returns (uint256 balance) {
            if (balance > 0) {
                return collectionQMultiplierBps > 0 ? collectionQMultiplierBps : BASE_WEIGHT;
            }
        } catch {}

        return BASE_WEIGHT;
    }

    function syncCollectionQ(uint256 tokenId) public whenNotPaused {
        if (!activationController.isActivated(tokenId)) return;
        uint256 currentWeight = nftWeight[tokenId];
        if (currentWeight == 0) currentWeight = BASE_WEIGHT;

        uint256 newWeight = getWeight(tokenId);
        if (newWeight == currentWeight) return;

        address[] storage chosen = _chosenAssets[tokenId];
        uint256 len = chosen.length;
        for (uint256 i = 0; i < len; i++) {
            address asset = chosen[i];
            // Settle accrued rewards for the preceding interval at the OLD weight first
            _settleChosenAsset(tokenId, asset);

            // Update pool total active weight
            if (activeWeightForAsset[asset] >= currentWeight) {
                activeWeightForAsset[asset] = activeWeightForAsset[asset] - currentWeight + newWeight;
            } else {
                activeWeightForAsset[asset] = newWeight;
            }
        }

        nftWeight[tokenId] = newWeight;
        emit CollectionQWeightUpdated(tokenId, currentWeight, newWeight);
    }

    function registerRewardAsset(address asset) external onlyOwner {
        if (asset == address(0)) revert ZeroAddressNotAllowed();
        if (rewardAssets[asset].isRegistered) revert AssetAlreadyRegistered(asset);

        uint8 tokenDecimals = 18;
        try IERC20Metadata(asset).decimals() returns (uint8 d) {
            tokenDecimals = d;
        } catch {}

        rewardAssets[asset] = RewardAssetInfo({
            isRegistered: true,
            decimals: tokenDecimals,
            rewardRate: 0,
            lastUpdateTime: block.timestamp,
            globalRewardIndex: 0,
            periodFinish: 0,
            totalFunded: 0
        });

        registeredRewardAssets.push(asset);
        emit RewardAssetRegistered(asset, tokenDecimals);
    }

    function setFunder(address funder, bool status) external onlyOwner {
        if (funder == address(0)) revert ZeroAddressNotAllowed();
        isFunder[funder] = status;
        emit FunderStatusUpdated(funder, status);
    }

    function setRewardVault(address _rewardVault) external onlyOwner {
        if (_rewardVault == address(0)) revert ZeroAddressNotAllowed();
        address oldVault = rewardVault;
        rewardVault = _rewardVault;
        emit RewardVaultUpdated(oldVault, _rewardVault);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function lastTimeRewardApplicable(address asset) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        return block.timestamp < info.periodFinish ? block.timestamp : info.periodFinish;
    }

    function rewardPerToken(address asset) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return 0;

        uint256 totalWeight = activeWeightForAsset[asset];
        if (totalWeight == 0) {
            return info.globalRewardIndex;
        }

        uint256 lastApplicable = lastTimeRewardApplicable(asset);
        if (lastApplicable <= info.lastUpdateTime) {
            return info.globalRewardIndex;
        }

        uint256 timeDelta = lastApplicable - info.lastUpdateTime;
        uint256 rewardEmitted = timeDelta * info.rewardRate;

        uint256 indexDelta = (rewardEmitted * PRECISION_FACTOR) / totalWeight;
        return info.globalRewardIndex + indexDelta;
    }

    function rewardPerTokenAtTimestamp(address asset, uint256 timestamp) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return 0;

        uint256 totalWeight = activeWeightForAsset[asset];
        if (totalWeight == 0) return info.globalRewardIndex;

        uint256 targetTime = timestamp;
        if (targetTime > info.periodFinish) targetTime = info.periodFinish;
        if (targetTime <= info.lastUpdateTime) return info.globalRewardIndex;

        uint256 timeDelta = targetTime - info.lastUpdateTime;
        uint256 rewardEmitted = timeDelta * info.rewardRate;
        uint256 indexDelta = (rewardEmitted * PRECISION_FACTOR) / totalWeight;

        return info.globalRewardIndex + indexDelta;
    }

    function _updateGlobalIndex(address asset) internal {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return;

        info.globalRewardIndex = rewardPerToken(asset);
        info.lastUpdateTime = lastTimeRewardApplicable(asset);
    }

    function fundReward(
        address asset,
        uint256 amount,
        uint256 duration
    ) external onlyFunder whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmountNotAllowed();
        if (duration == 0) revert ZeroDurationNotAllowed();

        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) revert AssetNotRegistered(asset);

        _updateGlobalIndex(asset);

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        if (block.timestamp >= info.periodFinish) {
            info.rewardRate = amount / duration;
        } else {
            uint256 remainingTime = info.periodFinish - block.timestamp;
            uint256 leftoverReward = remainingTime * info.rewardRate;
            info.rewardRate = (amount + leftoverReward) / duration;
        }

        info.lastUpdateTime = block.timestamp;
        info.periodFinish = block.timestamp + duration;
        info.totalFunded += amount;

        emit RewardFunded(asset, msg.sender, amount, duration, info.rewardRate, info.periodFinish);
    }

    function _getUserIndex(uint256 tokenId, address asset) internal view returns (uint256) {
        if (isUserIndexInitialized[tokenId][asset]) {
            return userRewardIndex[tokenId][asset];
        }

        if (!activationController.isActivated(tokenId)) {
            return 0;
        }

        uint256 actAt = activationController.getActivatedAt(tokenId);
        return rewardPerTokenAtTimestamp(asset, actAt);
    }

    function updateReward(uint256 tokenId) public whenNotPaused {
        syncCollectionQ(tokenId);
        address[] storage chosen = _chosenAssets[tokenId];
        uint256 len = chosen.length;
        for (uint256 i = 0; i < len; i++) {
            _updateRewardForTokenAsset(tokenId, chosen[i]);
        }
    }

    function updateRewardForAsset(uint256 tokenId, address asset) public whenNotPaused {
        syncCollectionQ(tokenId);
        _updateRewardForTokenAsset(tokenId, asset);
    }

    function _updateRewardForTokenAsset(uint256 tokenId, address asset) internal {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return;

        // Not a pick: the index still advances for whoever did choose it, but this NFT gets none.
        if (!hasChosenAsset[tokenId][asset]) {
            _updateGlobalIndex(asset);
            return;
        }

        uint256 userIndex = _getUserIndex(tokenId, asset);

        _updateGlobalIndex(asset);

        bool isAct = activationController.isActivated(tokenId);
        uint256 weight = nftWeight[tokenId] > 0 ? nftWeight[tokenId] : BASE_WEIGHT;

        if (!isAct) {
            if (isUserIndexInitialized[tokenId][asset]) {
                uint256 currIdx = info.globalRewardIndex;
                if (currIdx > userIndex) {
                    uint256 indexDelta = currIdx - userIndex;
                    uint256 pendingTokens = (indexDelta * weight) / PRECISION_FACTOR;
                    if (pendingTokens > 0) {
                        accruedRewards[tokenId][asset] += pendingTokens;
                    }
                }
                isUserIndexInitialized[tokenId][asset] = false;
            }
            userRewardIndex[tokenId][asset] = info.globalRewardIndex;
            return;
        }

        uint256 currentIndex = info.globalRewardIndex;

        if (!isUserIndexInitialized[tokenId][asset]) {
            userRewardIndex[tokenId][asset] = userIndex;
            isUserIndexInitialized[tokenId][asset] = true;
        }

        if (currentIndex > userIndex) {
            uint256 indexDelta = currentIndex - userIndex;
            uint256 pendingTokens = (indexDelta * weight) / PRECISION_FACTOR;

            if (pendingTokens > 0) {
                accruedRewards[tokenId][asset] += pendingTokens;
            }
            userRewardIndex[tokenId][asset] = currentIndex;
            emit RewardUpdated(tokenId, asset, accruedRewards[tokenId][asset], currentIndex);
        }
    }

    /**
     * @notice Starts an NFT earning its chosen assets. Picks are validated by the controller.
     * @dev Advance the index before incrementing the count/weight — the other way round re-prices
     *      every second since the last checkpoint at the new divisor and dilutes existing earners.
     */
    function onNftActivation(uint256 tokenId, address[] calldata assets) external whenNotPaused {
        if (msg.sender != address(activationController)) revert OnlyActivationControllerAllowed();

        _releaseChosenAssets(tokenId);

        uint256 weight = getWeight(tokenId);
        nftWeight[tokenId] = weight;

        uint256 len = assets.length;
        for (uint256 i = 0; i < len; i++) {
            address asset = assets[i];
            RewardAssetInfo storage info = rewardAssets[asset];
            if (!info.isRegistered) revert AssetNotRegistered(asset);
            if (hasChosenAsset[tokenId][asset]) revert DuplicateAssetChoice(asset);

            _updateGlobalIndex(asset);

            hasChosenAsset[tokenId][asset] = true;
            _chosenAssets[tokenId].push(asset);
            activeCountForAsset[asset] += 1;
            activeWeightForAsset[asset] += weight;

            userRewardIndex[tokenId][asset] = info.globalRewardIndex;
            isUserIndexInitialized[tokenId][asset] = true;

            emit RewardUpdated(tokenId, asset, accruedRewards[tokenId][asset], info.globalRewardIndex);
        }

        emit AssetsChosen(tokenId, assets);
    }

    /// @dev Not pause-gated: settling what an NFT already earned must never be blocked.
    function onNftDeactivation(uint256 tokenId) external {
        if (msg.sender != address(activationController)) revert OnlyActivationControllerAllowed();
        _releaseChosenAssets(tokenId);
    }

    /// @notice Repairs an NFT whose picks were never released because the transfer hook failed.
    /// @dev Permissionless: it refuses unless the controller already considers the NFT inactive.
    function releaseIfInactive(uint256 tokenId) external {
        if (activationController.isActivated(tokenId)) revert StillActivated(tokenId);
        _releaseChosenAssets(tokenId);
    }

    function _releaseChosenAssets(uint256 tokenId) internal {
        address[] storage chosen = _chosenAssets[tokenId];
        uint256 len = chosen.length;
        if (len == 0) return;

        address[] memory released = new address[](len);
        uint256 weight = nftWeight[tokenId] > 0 ? nftWeight[tokenId] : BASE_WEIGHT;

        for (uint256 i = 0; i < len; i++) {
            address asset = chosen[i];
            released[i] = asset;

            // Bank what is owed while the divisor still includes us, then step out of it.
            _settleChosenAsset(tokenId, asset);

            hasChosenAsset[tokenId][asset] = false;
            if (activeCountForAsset[asset] > 0) {
                activeCountForAsset[asset] -= 1;
            }
            if (activeWeightForAsset[asset] >= weight) {
                activeWeightForAsset[asset] -= weight;
            } else {
                activeWeightForAsset[asset] = 0;
            }
            isUserIndexInitialized[tokenId][asset] = false;
        }

        delete _chosenAssets[tokenId];
        nftWeight[tokenId] = 0;
        emit AssetsReleased(tokenId, released);
    }

    /**
     * @dev Settles one pick with no external calls. Runs per-pick inside the NFT transfer path,
     *      where the hook only gets 63/64 of remaining gas — the cross-contract reads in
     *      _updateRewardForTokenAsset are enough to exhaust that and have the failure swallowed.
     */
    function _settleChosenAsset(uint256 tokenId, address asset) internal {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return;

        _updateGlobalIndex(asset);

        uint256 currentIndex = info.globalRewardIndex;
        uint256 userIndex = userRewardIndex[tokenId][asset];
        uint256 weight = nftWeight[tokenId] > 0 ? nftWeight[tokenId] : BASE_WEIGHT;

        if (currentIndex > userIndex) {
            uint256 pendingTokens = ((currentIndex - userIndex) * weight) / PRECISION_FACTOR;
            if (pendingTokens > 0) {
                accruedRewards[tokenId][asset] += pendingTokens;
            }
        }

        userRewardIndex[tokenId][asset] = currentIndex;
        emit RewardUpdated(tokenId, asset, accruedRewards[tokenId][asset], currentIndex);
    }

    /**
     * @notice Settles and releases an NFT's picks during a transfer.
     * @dev The release lives here, not in the controller's hook. OohdiesNFT calls this one first;
     *      the later hook only gets 63/64 of what's left and silently starves on a tight gas
     *      limit, leaving the NFT activated for an owner who never paid to activate it.
     */
    function onNftTransfer(address from, address to, uint256 tokenId) external {
        if (msg.sender != address(oohdiesNFT)) revert OnlyNFTContractAllowed();

        _releaseChosenAssets(tokenId);

        emit NFTTransferSettled(tokenId, from, to);
    }

    function deductClaimableReward(uint256 tokenId, address asset) external whenNotPaused returns (uint256 claimable) {
        if (rewardVault != address(0) && msg.sender != rewardVault) revert OnlyRewardVaultAllowed();

        syncCollectionQ(tokenId);
        _updateRewardForTokenAsset(tokenId, asset);

        claimable = accruedRewards[tokenId][asset];

        if (claimable > 0) {
            accruedRewards[tokenId][asset] = 0;
            emit RewardUpdated(tokenId, asset, 0, userRewardIndex[tokenId][asset]);
        }
    }

    function getRegisteredRewardAssets() external view returns (address[] memory) {
        return registeredRewardAssets;
    }

    function isRegisteredAsset(address asset) external view returns (bool) {
        return rewardAssets[asset].isRegistered;
    }

    /// @notice Empty once the NFT is deactivated.
    function getChosenAssets(uint256 tokenId) external view returns (address[] memory) {
        return _chosenAssets[tokenId];
    }

    function getAccruedReward(uint256 tokenId, address asset) external view returns (uint256) {
        return accruedRewards[tokenId][asset];
    }

    function getPendingReward(uint256 tokenId, address asset) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return 0;
        if (!hasChosenAsset[tokenId][asset]) return 0;
        if (!activationController.isActivated(tokenId)) return 0;

        uint256 currentGlobalIndex = rewardPerToken(asset);
        uint256 userIndex = _getUserIndex(tokenId, asset);

        if (currentGlobalIndex <= userIndex) return 0;

        uint256 indexDelta = currentGlobalIndex - userIndex;
        uint256 weight = nftWeight[tokenId] > 0 ? nftWeight[tokenId] : getWeight(tokenId);
        return (indexDelta * weight) / PRECISION_FACTOR;
    }

    function getTotalClaimableReward(uint256 tokenId, address asset) external view returns (uint256) {
        return accruedRewards[tokenId][asset] + getPendingReward(tokenId, asset);
    }
}
