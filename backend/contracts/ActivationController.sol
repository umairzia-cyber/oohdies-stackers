pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBurnableERC20 {
    function burnFrom(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IEarningEngineActivation {
    function onNftActivation(uint256 tokenId, address[] calldata assets) external;
    function onNftDeactivation(uint256 tokenId) external;
    function isRegisteredAsset(address asset) external view returns (bool);
}

contract ActivationController is Ownable, Pausable, ReentrancyGuard {

    IERC721 public immutable oohdiesNFT;

    IBurnableERC20 public immutable bananaToken;

    uint256 public activationCost;

    address public earningEngine;

    mapping(uint256 => bool) public activated;

    mapping(uint256 => uint256) public activatedAt;

    uint256 public totalActivated;

    uint256 public requiredPicks = 3;

    event RequiredPicksUpdated(uint256 oldValue, uint256 newValue);
    event NFTActivated(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 bananaBurned,
        uint256 activatedAtTimestamp
    );
    event NFTDeactivated(uint256 indexed tokenId, address indexed previousOwner);
    event ActivationCostUpdated(uint256 oldCost, uint256 newCost);
    event EarningEngineUpdated(address indexed earningEngine);

    error NotNFTOwner(uint256 tokenId, address caller);
    error AlreadyActivated(uint256 tokenId);
    error ActivationCostNotSet();
    error ZeroAddressNotAllowed();
    error OnlyNFTContractAllowed();
    error WrongNumberOfPicks(uint256 provided, uint256 required);
    error AssetNotSelectable(address asset);
    error DuplicatePick(address asset);
    error EarningEngineNotSet();
    error InvalidRequiredPicks();

    constructor(
        address _oohdiesNFT,
        address _bananaToken,
        address _initialOwner,
        uint256 _activationCost
    ) Ownable(_initialOwner) {
        if (_oohdiesNFT == address(0)) revert ZeroAddressNotAllowed();
        if (_bananaToken == address(0)) revert ZeroAddressNotAllowed();

        oohdiesNFT = IERC721(_oohdiesNFT);
        bananaToken = IBurnableERC20(_bananaToken);
        activationCost = _activationCost;
    }

    function setActivationCost(uint256 newCost) external onlyOwner {
        uint256 oldCost = activationCost;
        activationCost = newCost;
        emit ActivationCostUpdated(oldCost, newCost);
    }

    function setEarningEngine(address _earningEngine) external onlyOwner {
        if (_earningEngine == address(0)) revert ZeroAddressNotAllowed();
        earningEngine = _earningEngine;
        emit EarningEngineUpdated(_earningEngine);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setRequiredPicks(uint256 newValue) external onlyOwner {
        if (newValue == 0) revert InvalidRequiredPicks();
        uint256 oldValue = requiredPicks;
        requiredPicks = newValue;
        emit RequiredPicksUpdated(oldValue, newValue);
    }

    /// @param assets Exactly `requiredPicks` distinct registered assets. The NFT earns only
    ///        these, sharing each one's stream with the others that chose it.
    function activate(uint256 tokenId, address[] calldata assets) external nonReentrant whenNotPaused {
        address nftOwner = oohdiesNFT.ownerOf(tokenId);
        if (nftOwner != msg.sender) revert NotNFTOwner(tokenId, msg.sender);

        if (activated[tokenId]) revert AlreadyActivated(tokenId);

        uint256 cost = activationCost;
        if (cost == 0) revert ActivationCostNotSet();

        if (earningEngine == address(0)) revert EarningEngineNotSet();
        if (assets.length != requiredPicks) revert WrongNumberOfPicks(assets.length, requiredPicks);

        // Validate before burning so a bad selection only costs gas.
        IEarningEngineActivation engine = IEarningEngineActivation(earningEngine);
        for (uint256 i = 0; i < assets.length; i++) {
            if (!engine.isRegisteredAsset(assets[i])) revert AssetNotSelectable(assets[i]);
            for (uint256 j = i + 1; j < assets.length; j++) {
                if (assets[i] == assets[j]) revert DuplicatePick(assets[i]);
            }
        }

        bananaToken.burnFrom(msg.sender, cost);

        engine.onNftActivation(tokenId, assets);

        activated[tokenId] = true;
        activatedAt[tokenId] = block.timestamp;
        totalActivated++;

        emit NFTActivated(tokenId, msg.sender, cost, block.timestamp);
    }

    function deactivateOnTransfer(uint256 tokenId) external nonReentrant {
        if (msg.sender != address(oohdiesNFT) && msg.sender != owner()) revert OnlyNFTContractAllowed();

        if (activated[tokenId]) {
            address previousOwner = address(0);
            try oohdiesNFT.ownerOf(tokenId) returns (address ownerAddr) {
                previousOwner = ownerAddr;
            } catch {}

            activated[tokenId] = false;
            activatedAt[tokenId] = 0;
            if (totalActivated > 0) {
                totalActivated--;
            }

            emit NFTDeactivated(tokenId, previousOwner);

            // No engine call here on purpose. This is the last hook OohdiesNFT invokes, so it
            // gets only 63/64 of the remaining gas and silently starves on a tight limit. Picks
            // are released in EarningEngine.onNftTransfer instead; if that ever fails to run,
            // EarningEngine.releaseIfInactive() repairs it.
        }
    }

    function isActivated(uint256 tokenId) external view returns (bool) {
        return activated[tokenId];
    }

    function getActivatedAt(uint256 tokenId) external view returns (uint256) {
        return activatedAt[tokenId];
    }
}
