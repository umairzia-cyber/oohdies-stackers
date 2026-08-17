pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IEarningEngineHook {
    function onNftTransfer(address from, address to, uint256 tokenId) external;
}

interface IActivationControllerHook {
    function deactivateOnTransfer(uint256 tokenId) external;
}

import "hardhat/console.sol";

contract OohdiesNFT is ERC721, Ownable, Pausable, ReentrancyGuard {

    uint256 public constant MAX_SUPPLY = 1111;

    uint256 private _totalMinted;

    uint256 public mintPrice;

    address public earningEngine;

    address public activationController;

    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event EarningEngineUpdated(address oldEngine, address newEngine);
    event ActivationControllerUpdated(address oldController, address newController);
    event Withdrawn(address indexed owner, uint256 amount);

    constructor(address initialOwner)
        ERC721("Oohdies", "OOH")
        Ownable(initialOwner)
    {
        mintPrice = 0;
    }

    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = _mintPrice;
        emit MintPriceUpdated(oldPrice, _mintPrice);
    }

    function setEarningEngine(address _earningEngine) external onlyOwner {
        address oldEngine = earningEngine;
        earningEngine = _earningEngine;
        emit EarningEngineUpdated(oldEngine, _earningEngine);
    }

    function setActivationController(address _activationController) external onlyOwner {
        address oldController = activationController;
        activationController = _activationController;
        emit ActivationControllerUpdated(oldController, _activationController);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "OohdiesNFT: no balance to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "OohdiesNFT: withdraw failed");
        emit Withdrawn(owner(), balance);
    }

    function mintBatch(address to, uint256 count)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(to != address(0), "OohdiesNFT: mint to zero address");
        require(count > 0, "OohdiesNFT: count must be greater than 0");
        require(
            _totalMinted + count <= MAX_SUPPLY,
            "OohdiesNFT: would exceed max supply"
        );

        for (uint256 i = 0; i < count; i++) {
            _totalMinted++;
            _safeMint(to, _totalMinted);
        }
    }

    function mint(address to) external payable nonReentrant whenNotPaused {
        require(to != address(0), "OohdiesNFT: mint to zero address");
        require(_totalMinted < MAX_SUPPLY, "OohdiesNFT: max supply reached");
        require(msg.value >= mintPrice, "OohdiesNFT: insufficient payment");

        _totalMinted++;
        uint256 tokenId = _totalMinted;
        _safeMint(to, tokenId);

        uint256 excess = msg.value - mintPrice;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "OohdiesNFT: refund failed");
        }
    }

    function totalMinted() external view returns (uint256) {
        return _totalMinted;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override whenNotPaused returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0)) {
            if (earningEngine != address(0)) {
                try IEarningEngineHook(earningEngine).onNftTransfer(from, to, tokenId) {} catch (bytes memory reason) {
                    console.log("onNftTransfer failed");
                    console.logBytes(reason);
                }
            }
            if (activationController != address(0)) {
                try IActivationControllerHook(activationController).deactivateOnTransfer(tokenId) {} catch (bytes memory reason) {
                    console.log("deactivateOnTransfer failed");
                    console.logBytes(reason);
                }
            }
        }

        return from;
    }
}
