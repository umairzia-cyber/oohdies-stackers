pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IEarningEngineVault {
    function getRegisteredRewardAssets() external view returns (address[] memory);
    function deductClaimableReward(uint256 tokenId, address asset) external returns (uint256);
    function getTotalClaimableReward(uint256 tokenId, address asset) external view returns (uint256);
}

contract RewardVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC721 public immutable oohdiesNFT;

    IEarningEngineVault public immutable earningEngine;

    mapping(address => uint256) public totalDeposited;

    mapping(address => uint256) public totalClaimed;

    event RewardDeposited(address indexed asset, address indexed depositor, uint256 amount);
    event RewardClaimed(
        uint256 indexed tokenId,
        address indexed asset,
        address indexed recipient,
        uint256 amount
    );

    error NotNFTOwner(uint256 tokenId, address caller);
    error InsufficientVaultBalance(address asset, uint256 required, uint256 available);
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error NoRewardToClaim();

    constructor(
        address _oohdiesNFT,
        address _earningEngine,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_oohdiesNFT == address(0)) revert ZeroAddressNotAllowed();
        if (_earningEngine == address(0)) revert ZeroAddressNotAllowed();

        oohdiesNFT = IERC721(_oohdiesNFT);
        earningEngine = IEarningEngineVault(_earningEngine);
    }

    function depositReward(address asset, uint256 amount) external whenNotPaused nonReentrant {
        if (asset == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) revert ZeroAmountNotAllowed();

        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));

        uint256 actualReceived = balanceAfter - balanceBefore;
        totalDeposited[asset] += actualReceived;

        emit RewardDeposited(asset, msg.sender, actualReceived);
    }

    function claimReward(uint256 tokenId, address asset) external whenNotPaused nonReentrant {

        address currentOwner = oohdiesNFT.ownerOf(tokenId);
        if (msg.sender != currentOwner) revert NotNFTOwner(tokenId, msg.sender);

        uint256 claimableAmount = earningEngine.deductClaimableReward(tokenId, asset);
        if (claimableAmount == 0) revert NoRewardToClaim();

        uint256 vaultBalance = IERC20(asset).balanceOf(address(this));
        if (vaultBalance < claimableAmount) {
            revert InsufficientVaultBalance(asset, claimableAmount, vaultBalance);
        }

        totalClaimed[asset] += claimableAmount;
        IERC20(asset).safeTransfer(msg.sender, claimableAmount);

        emit RewardClaimed(tokenId, asset, msg.sender, claimableAmount);
    }

    function claimAllRewards(uint256 tokenId) external whenNotPaused nonReentrant {
        address currentOwner = oohdiesNFT.ownerOf(tokenId);
        if (msg.sender != currentOwner) revert NotNFTOwner(tokenId, msg.sender);

        address[] memory assets = earningEngine.getRegisteredRewardAssets();
        uint256 len = assets.length;
        bool claimedAny = false;

        for (uint256 i = 0; i < len; i++) {
            address asset = assets[i];
            uint256 claimable = earningEngine.getTotalClaimableReward(tokenId, asset);
            if (claimable > 0) {
                uint256 vaultBalance = IERC20(asset).balanceOf(address(this));
                if (vaultBalance >= claimable) {
                    uint256 amountDeducted = earningEngine.deductClaimableReward(tokenId, asset);
                    if (amountDeducted > 0) {
                        totalClaimed[asset] += amountDeducted;
                        IERC20(asset).safeTransfer(msg.sender, amountDeducted);
                        emit RewardClaimed(tokenId, asset, msg.sender, amountDeducted);
                        claimedAny = true;
                    }
                }
            }
        }

        if (!claimedAny) revert NoRewardToClaim();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getVaultBalance(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }
}
