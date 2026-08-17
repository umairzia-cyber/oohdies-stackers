// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCollectionQ
 * @notice Realistic ERC-721 mock for testing Collection Q holder bonus mechanics.
 */
contract MockCollectionQ is ERC721, Ownable {
    constructor(address initialOwner)
        ERC721("Collection Q", "COLQ")
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }

    function burn(uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(
            msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender) || getApproved(tokenId) == msg.sender,
            "MockCollectionQ: not authorized to burn"
        );
        _burn(tokenId);
    }
}
