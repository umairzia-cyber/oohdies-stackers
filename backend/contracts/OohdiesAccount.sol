// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import {IERC6551Account} from "./erc6551/IERC6551Account.sol";
import {IERC6551Executable} from "./erc6551/IERC6551Executable.sol";

/**
 * @title OohdiesAccount
 * @notice ERC-6551 account implementation for the Oohdies collection: a wallet owned by an NFT
 *         rather than a person. Deployed once; the registry clones it per token.
 *
 * Changing this contract's address moves every account address, so treat it as permanent.
 */
contract OohdiesAccount is IERC6551Account, IERC6551Executable, IERC1271, ERC721Holder, ERC1155Holder {
    uint256 private _state;

    bytes4 internal constant MAGIC_IS_VALID_SIGNER = 0x523e3260;

    error NotAuthorized();
    error InvalidOperation(uint8 operation);
    error OwnershipCycle();

    receive() external payable {}

    /// @dev CALL only. Delegatecall would let one call rewrite this account's storage.
    function execute(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        payable
        returns (bytes memory result)
    {
        if (!_isValidSigner(msg.sender)) revert NotAuthorized();
        if (operation != 0) revert InvalidOperation(operation);

        unchecked {
            ++_state;
        }

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 0x20), mload(result))
            }
        }
    }

    /// @dev The registry appends (salt, chainId, tokenContract, tokenId) after the 45-byte proxy,
    ///      so the last three words start at 0x4d.
    function token() public view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        bytes memory footer = new bytes(0x60);
        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    /// @dev Read live, never stored — that is what makes the wallet follow the NFT on a sale.
    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function state() public view returns (uint256) {
        return _state;
    }

    function isValidSigner(address signer, bytes calldata) external view returns (bytes4) {
        if (_isValidSigner(signer)) return MAGIC_IS_VALID_SIGNER;
        return bytes4(0);
    }

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        address currentOwner = owner();
        if (currentOwner == address(0)) return bytes4(0);

        if (SignatureChecker.isValidSignatureNow(currentOwner, hash, signature)) {
            return IERC1271.isValidSignature.selector;
        }
        return bytes4(0);
    }

    /**
     * @dev Rejects the NFT that controls this account. Holding it would make the account its own
     *      owner and freeze it permanently. Only covers safeTransferFrom; a plain transferFrom
     *      skips receiver hooks, which _isValidSigner catches instead.
     */
    function onERC721Received(address, address, uint256 receivedTokenId, bytes memory)
        public
        view
        override
        returns (bytes4)
    {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();

        if (chainId == block.chainid && tokenContract == msg.sender && tokenId == receivedTokenId) {
            revert OwnershipCycle();
        }

        return IERC721Receiver.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC6551Account).interfaceId
            || interfaceId == type(IERC6551Executable).interfaceId
            || interfaceId == type(IERC1271).interfaceId
            || interfaceId == type(IERC721Receiver).interfaceId
            || super.supportsInterface(interfaceId);
    }

    function _isValidSigner(address signer) internal view returns (bool) {
        address currentOwner = owner();

        if (currentOwner == address(this)) revert OwnershipCycle();
        if (currentOwner == address(0)) return false;

        return signer == currentOwner;
    }
}
