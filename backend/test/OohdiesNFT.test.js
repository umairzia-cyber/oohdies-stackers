import { expect } from "chai";
import hre from "hardhat";

describe("OohdiesNFT", function () {

  async function deployOohdiesFixture(connection) {
    const { ethers } = connection;
    const [owner, alice, bob, charlie, operator] = await ethers.getSigners();
    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(owner.address);
    return { nft, owner, alice, bob, charlie, operator, ethers, OohdiesNFT };
  }

  const MAX_SUPPLY = 1_111n;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  async function loadFixture(fixture) {
    const { networkHelpers } = await hre.network.create();
    return networkHelpers.loadFixture(fixture);
  }

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.getAddress()).to.be.properAddress;
    });

    it("should set the correct name", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.name()).to.equal("Oohdies");
    });

    it("should set the correct symbol", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.symbol()).to.equal("OOH");
    });

    it("should set MAX_SUPPLY to exactly 1111", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("should start with zero totalMinted", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.totalMinted()).to.equal(0n);
    });

    it("should start with zero mint price", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      expect(await nft.mintPrice()).to.equal(0n);
    });

    it("should set the deployer as owner", async function () {
      const { nft, owner } = await loadFixture(deployOohdiesFixture);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("should revert deployment with zero address as owner", async function () {
      const { OohdiesNFT } = await loadFixture(deployOohdiesFixture);
      await expect(
        OohdiesNFT.deploy(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(OohdiesNFT, "OwnableInvalidOwner");
    });
  });

  describe("Public minting", function () {
    it("should mint an NFT with tokenId 1 on first mint", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.totalMinted()).to.equal(1n);
    });

    it("should mint sequential tokenIds", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);

      await nft.mint(alice.address);
      await nft.mint(bob.address);
      await nft.mint(alice.address);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
      expect(await nft.ownerOf(3n)).to.equal(alice.address);
      expect(await nft.totalMinted()).to.equal(3n);
    });

    it("should emit Transfer event on mint", async function () {
      const { nft, alice, ethers } = await loadFixture(deployOohdiesFixture);

      await expect(nft.mint(alice.address))
        .to.emit(nft, "Transfer")
        .withArgs(ZERO_ADDRESS, alice.address, 1n);
    });

    it("should accept exact mint price payment", async function () {
      const { nft, alice, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.05");
      await nft.setMintPrice(price);

      await nft.mint(alice.address, { value: price });
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("should refund excess payment", async function () {
      const { nft, alice, owner, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.05");
      const overpay = ethers.parseEther("0.1");
      await nft.setMintPrice(price);

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await nft.connect(alice).mint(alice.address, { value: overpay });

      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.equal(price);
    });

    it("should revert mint with insufficient payment", async function () {
      const { nft, alice, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.05");
      await nft.setMintPrice(price);

      await expect(
        nft.mint(alice.address, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("OohdiesNFT: insufficient payment");
    });

    it("should revert mint to zero address", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.mint(ZERO_ADDRESS)
      ).to.be.revertedWith("OohdiesNFT: mint to zero address");
    });

    it("anyone can call public mint", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);

      await nft.connect(alice).mint(bob.address);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("minted NFTs should have permanent ownership through ERC-721", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);

      await nft.mint(alice.address);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });
  });

  describe("Admin batch minting", function () {
    it("owner should be able to batch mint", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.mintBatch(alice.address, 5n);

      expect(await nft.totalMinted()).to.equal(5n);
      for (let i = 1n; i <= 5n; i++) {
        expect(await nft.ownerOf(i)).to.equal(alice.address);
      }
    });

    it("non-owner cannot batch mint", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.connect(alice).mintBatch(bob.address, 5n)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should revert batch mint to zero address", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.mintBatch(ZERO_ADDRESS, 5n)
      ).to.be.revertedWith("OohdiesNFT: mint to zero address");
    });

    it("should revert batch mint with count 0", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.mintBatch(alice.address, 0n)
      ).to.be.revertedWith("OohdiesNFT: count must be greater than 0");
    });

    it("batch mint should produce sequential tokenIds", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);

      await nft.mint(alice.address);
      await nft.mint(alice.address);

      await nft.mintBatch(bob.address, 3n);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(alice.address);
      expect(await nft.ownerOf(3n)).to.equal(bob.address);
      expect(await nft.ownerOf(4n)).to.equal(bob.address);
      expect(await nft.ownerOf(5n)).to.equal(bob.address);
    });
  });

  describe("Max supply enforcement", function () {

    async function mintedToMaxFixture(connection) {
      const base = await deployOohdiesFixture(connection);

      const batchSize = 100n;
      let remaining = MAX_SUPPLY;
      while (remaining > 0n) {
        const count = remaining > batchSize ? batchSize : remaining;
        await base.nft.mintBatch(base.owner.address, count);
        remaining -= count;
      }
      return base;
    }

    it("should mint exactly MAX_SUPPLY NFTs", async function () {
      const { nft } = await loadFixture(mintedToMaxFixture);
      expect(await nft.totalMinted()).to.equal(MAX_SUPPLY);
    });

    it("tokenId 1111 should exist at max supply", async function () {
      const { nft, owner } = await loadFixture(mintedToMaxFixture);
      expect(await nft.ownerOf(1111n)).to.equal(owner.address);
    });

    it("should revert public mint after MAX_SUPPLY is reached", async function () {
      const { nft, alice } = await loadFixture(mintedToMaxFixture);
      await expect(
        nft.mint(alice.address)
      ).to.be.revertedWith("OohdiesNFT: max supply reached");
    });

    it("should revert admin batch mint after MAX_SUPPLY is reached", async function () {
      const { nft, alice } = await loadFixture(mintedToMaxFixture);
      await expect(
        nft.mintBatch(alice.address, 1n)
      ).to.be.revertedWith("OohdiesNFT: would exceed max supply");
    });

    it("cannot mint token #1112 — ever", async function () {
      const { nft, alice, ethers } = await loadFixture(mintedToMaxFixture);

      await expect(nft.mint(alice.address)).to.be.revert(ethers);
      await expect(nft.mintBatch(alice.address, 1n)).to.be.revert(ethers);
      expect(await nft.totalMinted()).to.equal(MAX_SUPPLY);
    });

    it("batch mint should revert if it would exceed MAX_SUPPLY", async function () {
      const { nft, owner, alice } = await loadFixture(deployOohdiesFixture);

      const batchSize = 100n;
      let remaining = 1110n;
      while (remaining > 0n) {
        const count = remaining > batchSize ? batchSize : remaining;
        await nft.mintBatch(owner.address, count);
        remaining -= count;
      }
      expect(await nft.totalMinted()).to.equal(1110n);

      await expect(
        nft.mintBatch(alice.address, 2n)
      ).to.be.revertedWith("OohdiesNFT: would exceed max supply");

      await nft.mint(alice.address);
      expect(await nft.totalMinted()).to.equal(MAX_SUPPLY);
    });

    it("totalMinted should never exceed MAX_SUPPLY", async function () {
      const { nft } = await loadFixture(mintedToMaxFixture);
      expect(await nft.totalMinted()).to.equal(MAX_SUPPLY);
      expect(await nft.totalMinted()).to.be.lte(MAX_SUPPLY);
    });
  });

  describe("Token ID uniqueness", function () {
    it("cannot mint the same tokenId twice (sequential IDs prevent this by construction)", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(alice.address);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(alice.address);

      expect(await nft.totalMinted()).to.equal(2n);
    });

    it("each minted token has a unique sequential ID", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(bob.address);
      await nft.mint(charlie.address);

      const owners = new Map();
      for (let i = 1n; i <= 3n; i++) {
        const tokenOwner = await nft.ownerOf(i);
        expect(owners.has(i)).to.equal(false);
        owners.set(i, tokenOwner);
      }
      expect(owners.size).to.equal(3);
    });
  });

  describe("Transfers", function () {
    it("owner of NFT can transfer via transferFrom", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("should emit Transfer event on transfer", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft.connect(alice).transferFrom(alice.address, bob.address, 1n)
      )
        .to.emit(nft, "Transfer")
        .withArgs(alice.address, bob.address, 1n);
    });

    it("non-owner/non-approved cannot transfer", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft.connect(bob).transferFrom(alice.address, charlie.address, 1n)
      ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
    });

    it("should revert transfer to zero address", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft.connect(alice).transferFrom(alice.address, ZERO_ADDRESS, 1n)
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidReceiver");
    });

    it("transfer should update balanceOf", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(alice.address);

      expect(await nft.balanceOf(alice.address)).to.equal(2n);
      expect(await nft.balanceOf(bob.address)).to.equal(0n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await nft.balanceOf(alice.address)).to.equal(1n);
      expect(await nft.balanceOf(bob.address)).to.equal(1n);
    });

    it("previous owner loses ownership after transfer", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await expect(
        nft.connect(alice).transferFrom(bob.address, alice.address, 1n)
      ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
    });
  });

  describe("safeTransferFrom", function () {
    it("should safely transfer to an EOA", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await nft
        .connect(alice)
        ["safeTransferFrom(address,address,uint256)"](
          alice.address,
          bob.address,
          1n
        );
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("should emit Transfer event on safeTransferFrom", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft
          .connect(alice)
          ["safeTransferFrom(address,address,uint256)"](
            alice.address,
            bob.address,
            1n
          )
      )
        .to.emit(nft, "Transfer")
        .withArgs(alice.address, bob.address, 1n);
    });

    it("non-owner cannot safeTransferFrom", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft
          .connect(bob)
          ["safeTransferFrom(address,address,uint256)"](
            alice.address,
            charlie.address,
            1n
          )
      ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
    });
  });

  describe("Approvals", function () {
    it("owner can approve another address for a specific token", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await nft.connect(alice).approve(bob.address, 1n);
      expect(await nft.getApproved(1n)).to.equal(bob.address);
    });

    it("should emit Approval event", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(nft.connect(alice).approve(bob.address, 1n))
        .to.emit(nft, "Approval")
        .withArgs(alice.address, bob.address, 1n);
    });

    it("approved address can transfer the token", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.connect(alice).approve(bob.address, 1n);

      await nft.connect(bob).transferFrom(alice.address, charlie.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(charlie.address);
    });

    it("approval is cleared after transfer", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.connect(alice).approve(bob.address, 1n);

      await nft.connect(bob).transferFrom(alice.address, charlie.address, 1n);
      expect(await nft.getApproved(1n)).to.equal(ZERO_ADDRESS);
    });

    it("non-owner cannot approve", async function () {
      const { nft, alice, bob, charlie } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);

      await expect(
        nft.connect(bob).approve(charlie.address, 1n)
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidApprover");
    });

    it("owner can setApprovalForAll", async function () {
      const { nft, alice, operator } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(alice.address);

      await nft.connect(alice).setApprovalForAll(operator.address, true);
      expect(await nft.isApprovedForAll(alice.address, operator.address)).to.equal(true);
    });

    it("operator with ApprovalForAll can transfer any token of the owner", async function () {
      const { nft, alice, bob, operator } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(alice.address);

      await nft.connect(alice).setApprovalForAll(operator.address, true);

      await nft.connect(operator).transferFrom(alice.address, bob.address, 1n);
      await nft.connect(operator).transferFrom(alice.address, bob.address, 2n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
    });

    it("revoking ApprovalForAll prevents further transfers by operator", async function () {
      const { nft, alice, bob, operator } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.mint(alice.address);

      await nft.connect(alice).setApprovalForAll(operator.address, true);
      await nft.connect(alice).setApprovalForAll(operator.address, false);

      await expect(
        nft.connect(operator).transferFrom(alice.address, bob.address, 1n)
      ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
    });
  });

  describe("Pause / Unpause", function () {
    it("owner can pause", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await nft.pause();
      expect(await nft.paused()).to.equal(true);
    });

    it("owner can unpause", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await nft.pause();
      await nft.unpause();
      expect(await nft.paused()).to.equal(false);
    });

    it("non-owner cannot pause", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.connect(alice).pause()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot unpause", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.pause();
      await expect(
        nft.connect(alice).unpause()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("public mint should revert when paused", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.pause();

      await expect(
        nft.mint(alice.address)
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("batch mint should revert when paused", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.pause();

      await expect(
        nft.mintBatch(alice.address, 5n)
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("transfers should revert when paused", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.pause();

      await expect(
        nft.connect(alice).transferFrom(alice.address, bob.address, 1n)
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("safeTransferFrom should revert when paused", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.pause();

      await expect(
        nft
          .connect(alice)
          ["safeTransferFrom(address,address,uint256)"](
            alice.address,
            bob.address,
            1n
          )
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("minting and transfers should resume after unpause", async function () {
      const { nft, alice, bob, ethers } = await loadFixture(deployOohdiesFixture);
      await nft.pause();
      await nft.unpause();

      await expect(nft.mint(alice.address)).to.not.be.revert(ethers);
      await expect(
        nft.connect(alice).transferFrom(alice.address, bob.address, 1n)
      ).to.not.be.revert(ethers);
    });

    it("approvals should still work when paused", async function () {
      const { nft, alice, bob, ethers } = await loadFixture(deployOohdiesFixture);
      await nft.mint(alice.address);
      await nft.pause();

      await expect(nft.connect(alice).approve(bob.address, 1n)).to.not.be.revert(ethers);
    });
  });

  describe("Ownership", function () {
    it("should allow owner to transfer ownership", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await nft.transferOwnership(alice.address);
      expect(await nft.owner()).to.equal(alice.address);
    });

    it("should allow owner to renounce ownership", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await nft.renounceOwnership();
      expect(await nft.owner()).to.equal(ZERO_ADDRESS);
    });

    it("non-owner cannot transfer ownership", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.connect(alice).transferOwnership(bob.address)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("new owner can use admin functions after ownership transfer", async function () {
      const { nft, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.transferOwnership(alice.address);

      await nft.connect(alice).mintBatch(bob.address, 3n);
      expect(await nft.totalMinted()).to.equal(3n);
    });

    it("old owner loses admin functions after ownership transfer", async function () {
      const { nft, owner, alice, bob } = await loadFixture(deployOohdiesFixture);
      await nft.transferOwnership(alice.address);

      await expect(
        nft.connect(owner).mintBatch(bob.address, 3n)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  describe("Mint price configuration", function () {
    it("owner can set mint price", async function () {
      const { nft, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.1");
      await nft.setMintPrice(price);
      expect(await nft.mintPrice()).to.equal(price);
    });

    it("should emit MintPriceUpdated event", async function () {
      const { nft, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.1");

      await expect(nft.setMintPrice(price))
        .to.emit(nft, "MintPriceUpdated")
        .withArgs(0n, price);
    });

    it("non-owner cannot set mint price", async function () {
      const { nft, alice, ethers } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.connect(alice).setMintPrice(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("owner can set mint price to zero", async function () {
      const { nft, ethers } = await loadFixture(deployOohdiesFixture);
      await nft.setMintPrice(ethers.parseEther("0.1"));
      await nft.setMintPrice(0n);
      expect(await nft.mintPrice()).to.equal(0n);
    });
  });

  describe("Withdraw", function () {
    it("owner can withdraw contract balance", async function () {
      const { nft, owner, alice, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.05");
      await nft.setMintPrice(price);
      await nft.connect(alice).mint(alice.address, { value: price });

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalAfter).to.equal(ownerBalBefore + price - gasUsed);
    });

    it("should emit Withdrawn event", async function () {
      const { nft, owner, alice, ethers } = await loadFixture(deployOohdiesFixture);
      const price = ethers.parseEther("0.05");
      await nft.setMintPrice(price);
      await nft.connect(alice).mint(alice.address, { value: price });

      await expect(nft.withdraw())
        .to.emit(nft, "Withdrawn")
        .withArgs(owner.address, price);
    });

    it("non-owner cannot withdraw", async function () {
      const { nft, alice } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should revert withdraw when no balance", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(nft.withdraw()).to.be.revertedWith(
        "OohdiesNFT: no balance to withdraw"
      );
    });
  });

  describe("Zero-address edge cases", function () {
    it("balanceOf zero address should revert", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.balanceOf(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidOwner");
    });

    it("ownerOf non-existent token should revert", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.ownerOf(999n)
      ).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });

    it("ownerOf tokenId 0 should revert", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);
      await expect(
        nft.ownerOf(0n)
      ).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });
  });

  describe("ERC-721 interface compliance", function () {
    it("supports ERC-721 interface", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);

      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("supports ERC-165 interface", async function () {
      const { nft } = await loadFixture(deployOohdiesFixture);

      expect(await nft.supportsInterface("0x01ffc9a7")).to.equal(true);
    });
  });
});
