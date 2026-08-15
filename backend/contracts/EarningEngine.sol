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

    address[] public registeredRewardAssets;

    mapping(address => RewardAssetInfo) public rewardAssets;

    mapping(address => bool) public isFunder;

    mapping(uint256 => mapping(address => uint256)) public userRewardIndex;

    mapping(uint256 => mapping(address => uint256)) public accruedRewards;

    mapping(uint256 => mapping(address => bool)) public isUserIndexInitialized;

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

    error AssetNotRegistered(address asset);
    error AssetAlreadyRegistered(address asset);
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error ZeroDurationNotAllowed();
    error UnauthorizedFunder();
    error OnlyNFTContractAllowed();
    error OnlyRewardVaultAllowed();
    error OnlyActivationControllerAllowed();

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

        uint256 numActive = activationController.totalActivated();
        if (numActive == 0) {
            return info.globalRewardIndex;
        }

        uint256 lastApplicable = lastTimeRewardApplicable(asset);
        if (lastApplicable <= info.lastUpdateTime) {
            return info.globalRewardIndex;
        }

        uint256 timeDelta = lastApplicable - info.lastUpdateTime;
        uint256 rewardEmitted = timeDelta * info.rewardRate;

        uint256 indexDelta = (rewardEmitted * PRECISION_FACTOR) / numActive;
        return info.globalRewardIndex + indexDelta;
    }

    function rewardPerTokenAtTimestamp(address asset, uint256 timestamp) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return 0;

        uint256 numActive = activationController.totalActivated();
        if (numActive == 0) return info.globalRewardIndex;

        uint256 targetTime = timestamp;
        if (targetTime > info.periodFinish) targetTime = info.periodFinish;
        if (targetTime <= info.lastUpdateTime) return info.globalRewardIndex;

        uint256 timeDelta = targetTime - info.lastUpdateTime;
        uint256 rewardEmitted = timeDelta * info.rewardRate;
        uint256 indexDelta = (rewardEmitted * PRECISION_FACTOR) / numActive;

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
        uint256 len = registeredRewardAssets.length;
        for (uint256 i = 0; i < len; i++) {
            _updateRewardForTokenAsset(tokenId, registeredRewardAssets[i]);
        }
    }

    function updateRewardForAsset(uint256 tokenId, address asset) public whenNotPaused {
        _updateRewardForTokenAsset(tokenId, asset);
    }

    function _updateRewardForTokenAsset(uint256 tokenId, address asset) internal {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return;

        uint256 userIndex = _getUserIndex(tokenId, asset);

        _updateGlobalIndex(asset);

        bool isAct = activationController.isActivated(tokenId);

        if (!isAct) {
            if (isUserIndexInitialized[tokenId][asset]) {
                uint256 currentIndex = info.globalRewardIndex;
                if (currentIndex > userIndex) {
                    uint256 indexDelta = currentIndex - userIndex;
                    uint256 pendingTokens = indexDelta / PRECISION_FACTOR;
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
            uint256 pendingTokens = indexDelta / PRECISION_FACTOR;

            if (pendingTokens > 0) {
                accruedRewards[tokenId][asset] += pendingTokens;
            }
            userRewardIndex[tokenId][asset] = currentIndex;
            emit RewardUpdated(tokenId, asset, accruedRewards[tokenId][asset], currentIndex);
        }
    }

    function onNftActivation(uint256 tokenId) external whenNotPaused {
        if (msg.sender != address(activationController)) revert OnlyActivationControllerAllowed();

        uint256 len = registeredRewardAssets.length;
        for (uint256 i = 0; i < len; i++) {
            address asset = registeredRewardAssets[i];
            RewardAssetInfo storage info = rewardAssets[asset];
            if (!info.isRegistered) continue;

            _updateGlobalIndex(asset);

            userRewardIndex[tokenId][asset] = info.globalRewardIndex;
            isUserIndexInitialized[tokenId][asset] = true;

            emit RewardUpdated(tokenId, asset, accruedRewards[tokenId][asset], info.globalRewardIndex);
        }
    }

    function onNftTransfer(address from, address to, uint256 tokenId) external {
        if (msg.sender != address(oohdiesNFT)) revert OnlyNFTContractAllowed();

        updateReward(tokenId);

        uint256 len = registeredRewardAssets.length;
        for (uint256 i = 0; i < len; i++) {
            isUserIndexInitialized[tokenId][registeredRewardAssets[i]] = false;
        }

        emit NFTTransferSettled(tokenId, from, to);
    }

    function deductClaimableReward(uint256 tokenId, address asset) external whenNotPaused returns (uint256 claimable) {
        if (rewardVault != address(0) && msg.sender != rewardVault) revert OnlyRewardVaultAllowed();

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

    function getAccruedReward(uint256 tokenId, address asset) external view returns (uint256) {
        return accruedRewards[tokenId][asset];
    }

    function getPendingReward(uint256 tokenId, address asset) public view returns (uint256) {
        RewardAssetInfo storage info = rewardAssets[asset];
        if (!info.isRegistered) return 0;
        if (!activationController.isActivated(tokenId)) return 0;

        uint256 currentGlobalIndex = rewardPerToken(asset);
        uint256 userIndex = _getUserIndex(tokenId, asset);

        if (currentGlobalIndex <= userIndex) return 0;

        uint256 indexDelta = currentGlobalIndex - userIndex;
        return indexDelta / PRECISION_FACTOR;
    }

    function getTotalClaimableReward(uint256 tokenId, address asset) external view returns (uint256) {
        return accruedRewards[tokenId][asset] + getPendingReward(tokenId, asset);
    }
}
