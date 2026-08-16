pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./erc6551/IERC6551Registry.sol";

interface IEarningEngineVault {
    function getRegisteredRewardAssets() external view returns (address[] memory);
    function deductClaimableReward(uint256 tokenId, address asset) external returns (uint256);
    function getTotalClaimableReward(uint256 tokenId, address asset) external view returns (uint256);
}

contract RewardVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC721 public immutable oohdiesNFT;

    IEarningEngineVault public immutable earningEngine;

    IERC6551Registry public immutable registry;

    /// @dev Baked into every derived wallet address; changing it relocates all 1,111 wallets.
    address public immutable accountImplementation;

    bytes32 public immutable accountSalt;

    mapping(address => uint256) public totalDeposited;

    mapping(address => uint256) public totalClaimed;

    event RewardDeposited(address indexed asset, address indexed depositor, uint256 amount);
    event RewardClaimed(
        uint256 indexed tokenId,
        address indexed asset,
        address indexed recipient,
        uint256 amount
    );

    error InsufficientVaultBalance(address asset, uint256 required, uint256 available);
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error NoRewardToClaim();

    constructor(
        address _oohdiesNFT,
        address _earningEngine,
        address _initialOwner,
        address _registry,
        address _accountImplementation,
        bytes32 _accountSalt
    ) Ownable(_initialOwner) {
        if (_oohdiesNFT == address(0)) revert ZeroAddressNotAllowed();
        if (_earningEngine == address(0)) revert ZeroAddressNotAllowed();
        if (_registry == address(0)) revert ZeroAddressNotAllowed();
        if (_accountImplementation == address(0)) revert ZeroAddressNotAllowed();

        oohdiesNFT = IERC721(_oohdiesNFT);
        earningEngine = IEarningEngineVault(_earningEngine);
        registry = IERC6551Registry(_registry);
        accountImplementation = _accountImplementation;
        accountSalt = _accountSalt;
    }

    /**
     * @notice The wallet belonging to a given Oohdie. Rewards are paid here.
     * @dev Pure derivation — the account need not exist yet. Transfers to an undeployed address
     *      still land, and become spendable once it is created.
     */
    function accountOf(uint256 tokenId) public view returns (address) {
        return registry.account(
            accountImplementation, accountSalt, block.chainid, address(oohdiesNFT), tokenId
        );
    }

    /// @notice Deploys an Oohdie's wallet. Permissionless, idempotent, not required to claim.
    function createAccount(uint256 tokenId) external returns (address) {
        return registry.createAccount(
            accountImplementation, accountSalt, block.chainid, address(oohdiesNFT), tokenId
        );
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

    /**
     * @notice Moves an Oohdie's accrued rewards into that Oohdie's own wallet.
     * @dev Permissionless: the destination comes from the tokenId, so a caller has nothing to
     *      redirect. Authorization moved rather than vanished — spending from the wallet still
     *      requires owning the NFT.
     */
    function claimReward(uint256 tokenId, address asset) external whenNotPaused nonReentrant {
        address recipient = accountOf(tokenId);

        uint256 claimableAmount = earningEngine.deductClaimableReward(tokenId, asset);
        if (claimableAmount == 0) revert NoRewardToClaim();

        uint256 vaultBalance = IERC20(asset).balanceOf(address(this));
        if (vaultBalance < claimableAmount) {
            revert InsufficientVaultBalance(asset, claimableAmount, vaultBalance);
        }

        totalClaimed[asset] += claimableAmount;
        IERC20(asset).safeTransfer(recipient, claimableAmount);

        emit RewardClaimed(tokenId, asset, recipient, claimableAmount);
    }

    function claimAllRewards(uint256 tokenId) external whenNotPaused nonReentrant {
        address recipient = accountOf(tokenId);

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
                        IERC20(asset).safeTransfer(recipient, amountDeducted);
                        emit RewardClaimed(tokenId, asset, recipient, amountDeducted);
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
