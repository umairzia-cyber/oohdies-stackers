import { expect } from "chai";
import hre from "hardhat";
import { ZERO_SALT, getRegistry, installRegistry, predictAccount } from "./helpers/erc6551.js";

describe("OohdiesAccount (ERC-6551 token bound account)", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const IID_ERC6551_ACCOUNT = "0x6faff5f1";
  const IID_ERC6551_EXECUTABLE = "0x51945447";
  const IID_ERC721_RECEIVER = "0x150b7a02";
  const IID_ERC1155_RECEIVER = "0x4e2312e0";
  const IID_ERC165 = "0x01ffc9a7";
  const IID_ERC1271 = "0x1626ba7e";

  const MAGIC_IS_VALID_SIGNER = "0x523e3260";
  const MAGIC_ERC1271 = "0x1626ba7e";
  const NOT_MAGIC = "0x00000000";

  let connection;
  let ethers;
  let networkHelpers;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function loadFixture(fixture) {
    return networkHelpers.loadFixture(fixture);
  }

  async function deployAccountFixture() {
    const [owner, alice, bob, attacker] = await ethers.getSigners();

    await installRegistry(networkHelpers);
    const registry = await getRegistry(ethers);

    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(owner.address);
    const nftAddr = await nft.getAddress();

    const OohdiesAccount = await ethers.getContractFactory("OohdiesAccount");
    const implementation = await OohdiesAccount.deploy();
    const implAddr = await implementation.getAddress();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    await nft.mint(alice.address);
    await nft.mint(bob.address);

    await registry.createAccount(implAddr, ZERO_SALT, chainId, nftAddr, 1n);
    const accountAddr = await registry.account(implAddr, ZERO_SALT, chainId, nftAddr, 1n);
    const account = await ethers.getContractAt("OohdiesAccount", accountAddr);

    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const usdg = await MockRewardToken.deploy("USD Global", "USDG", 6, owner.address);
    const usdgAddr = await usdg.getAddress();

    return {
      owner, alice, bob, attacker,
      registry, nft, nftAddr,
      implementation, implAddr,
      account, accountAddr,
      usdg, usdgAddr,
      chainId,
    };
  }

  function encodeTransfer(token, to, amount) {
    return token.interface.encodeFunctionData("transfer", [to, amount]);
  }

  describe("Identity", function () {
    it("knows which NFT it belongs to", async function () {
      const { account, nftAddr, chainId } = await loadFixture(deployAccountFixture);

      const [tokenChainId, tokenContract, tokenId] = await account.token();
      expect(tokenChainId).to.equal(chainId);
      expect(tokenContract).to.equal(nftAddr);
      expect(tokenId).to.equal(1n);
    });

    it("lands at the address predicted offline", async function () {
      const { accountAddr, implAddr, nftAddr, chainId } = await loadFixture(deployAccountFixture);

      expect(accountAddr).to.equal(
        predictAccount({ implementation: implAddr, tokenContract: nftAddr, tokenId: 1n, chainId })
      );
    });

    it("reports the current NFT holder as its owner", async function () {
      const { account, alice } = await loadFixture(deployAccountFixture);
      expect(await account.owner()).to.equal(alice.address);
    });

    it("changes owner by itself when the NFT is sold, with no update call", async function () {
      const { account, nft, alice, bob } = await loadFixture(deployAccountFixture);

      expect(await account.owner()).to.equal(alice.address);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      // Nothing was called on the account — ownership is read live.
      expect(await account.owner()).to.equal(bob.address);
    });
  });

  describe("Receiving assets", function () {
    it("accepts plain ETH", async function () {
      const { account, accountAddr, owner } = await loadFixture(deployAccountFixture);

      await owner.sendTransaction({ to: accountAddr, value: ethers.parseEther("1") });
      expect(await ethers.provider.getBalance(accountAddr)).to.equal(ethers.parseEther("1"));
    });

    it("accepts an ERC-20", async function () {
      const { account, accountAddr, usdg, owner } = await loadFixture(deployAccountFixture);

      await usdg.mint(owner.address, 1_000n * 10n ** 6n);
      await usdg.transfer(accountAddr, 250n * 10n ** 6n);

      expect(await usdg.balanceOf(accountAddr)).to.equal(250n * 10n ** 6n);
    });

    it("accepts another collection's ERC-721 via safeTransferFrom", async function () {
      const { accountAddr, owner, alice } = await loadFixture(deployAccountFixture);

      const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
      const otherNft = await OohdiesNFT.deploy(owner.address);
      await otherNft.mint(alice.address);

      await otherNft
        .connect(alice)
        ["safeTransferFrom(address,address,uint256)"](alice.address, accountAddr, 1n);

      expect(await otherNft.ownerOf(1n)).to.equal(accountAddr);
    });

    it("accepts ERC-1155 single and batch transfers", async function () {
      const { accountAddr, owner } = await loadFixture(deployAccountFixture);

      const MockERC1155 = await ethers.getContractFactory("MockERC1155");
      const multi = await MockERC1155.deploy();

      await multi.mint(owner.address, 1n, 10n);
      await multi.mintBatch(owner.address, [2n, 3n], [20n, 30n]);

      await multi.connect(owner).safeTransferFrom(owner.address, accountAddr, 1n, 10n, "0x");
      await multi
        .connect(owner)
        .safeBatchTransferFrom(owner.address, accountAddr, [2n, 3n], [20n, 30n], "0x");

      expect(await multi.balanceOf(accountAddr, 1n)).to.equal(10n);
      expect(await multi.balanceOf(accountAddr, 2n)).to.equal(20n);
      expect(await multi.balanceOf(accountAddr, 3n)).to.equal(30n);
    });
  });

  describe("Control", function () {
    async function fundedFixture() {
      const ctx = await deployAccountFixture();
      await ctx.usdg.mint(ctx.owner.address, 1_000n * 10n ** 6n);
      await ctx.usdg.transfer(ctx.accountAddr, 500n * 10n ** 6n);
      return ctx;
    }

    it("lets the NFT owner move tokens out", async function () {
      const { account, alice, usdg, usdgAddr, accountAddr } = await loadFixture(fundedFixture);

      await account
        .connect(alice)
        .execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 100n * 10n ** 6n), 0);

      expect(await usdg.balanceOf(alice.address)).to.equal(100n * 10n ** 6n);
      expect(await usdg.balanceOf(accountAddr)).to.equal(400n * 10n ** 6n);
    });

    it("lets the NFT owner move ETH out", async function () {
      const { account, accountAddr, alice, bob, owner } = await loadFixture(deployAccountFixture);

      await owner.sendTransaction({ to: accountAddr, value: ethers.parseEther("2") });
      const before = await ethers.provider.getBalance(bob.address);

      await account.connect(alice).execute(bob.address, ethers.parseEther("1"), "0x", 0);

      expect(await ethers.provider.getBalance(bob.address)).to.equal(before + ethers.parseEther("1"));
    });

    it("refuses a non-owner", async function () {
      const { account, bob, usdg, usdgAddr } = await loadFixture(fundedFixture);

      await expect(
        account.connect(bob).execute(usdgAddr, 0, encodeTransfer(usdg, bob.address, 1n), 0)
      ).to.be.revertedWithCustomError(account, "NotAuthorized");
    });

    it("refuses an unrelated attacker", async function () {
      const { account, attacker, usdg, usdgAddr } = await loadFixture(fundedFixture);

      await expect(
        account.connect(attacker).execute(usdgAddr, 0, encodeTransfer(usdg, attacker.address, 1n), 0)
      ).to.be.revertedWithCustomError(account, "NotAuthorized");
    });

    it("refuses DELEGATECALL, CREATE and CREATE2", async function () {
      const { account, alice, usdgAddr } = await loadFixture(fundedFixture);

      for (const operation of [1, 2, 3]) {
        await expect(
          account.connect(alice).execute(usdgAddr, 0, "0x", operation)
        ).to.be.revertedWithCustomError(account, "InvalidOperation");
      }
    });

    it("bubbles up the underlying revert reason", async function () {
      const { account, alice, usdg, usdgAddr } = await loadFixture(deployAccountFixture);

      await expect(
        account.connect(alice).execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 1n), 0)
      ).to.be.revertedWithCustomError(usdg, "ERC20InsufficientBalance");
    });

    it("increments state() on every execute", async function () {
      const { account, alice, usdg, usdgAddr } = await loadFixture(fundedFixture);

      expect(await account.state()).to.equal(0n);

      await account.connect(alice).execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 1n), 0);
      expect(await account.state()).to.equal(1n);

      await account.connect(alice).execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 1n), 0);
      expect(await account.state()).to.equal(2n);
    });
  });

  describe("Signing", function () {
    it("isValidSigner returns the magic value for the owner only", async function () {
      const { account, alice, bob, attacker } = await loadFixture(deployAccountFixture);

      expect(await account.isValidSigner(alice.address, "0x")).to.equal(MAGIC_IS_VALID_SIGNER);
      expect(await account.isValidSigner(bob.address, "0x")).to.equal(NOT_MAGIC);
      expect(await account.isValidSigner(attacker.address, "0x")).to.equal(NOT_MAGIC);
    });

    it("isValidSigner follows the NFT to its new owner", async function () {
      const { account, nft, alice, bob } = await loadFixture(deployAccountFixture);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await account.isValidSigner(bob.address, "0x")).to.equal(MAGIC_IS_VALID_SIGNER);
      expect(await account.isValidSigner(alice.address, "0x")).to.equal(NOT_MAGIC);
    });

    it("validates ERC-1271 signatures from the owner and rejects others", async function () {
      const { account, alice, attacker } = await loadFixture(deployAccountFixture);

      const message = "oohdies";
      const hash = ethers.hashMessage(message);

      expect(await account.isValidSignature(hash, await alice.signMessage(message))).to.equal(
        MAGIC_ERC1271
      );
      expect(await account.isValidSignature(hash, await attacker.signMessage(message))).to.equal(
        NOT_MAGIC
      );
    });
  });

  describe("ERC-165", function () {
    it("advertises every interface it implements", async function () {
      const { account } = await loadFixture(deployAccountFixture);

      for (const id of [
        IID_ERC6551_ACCOUNT,
        IID_ERC6551_EXECUTABLE,
        IID_ERC721_RECEIVER,
        IID_ERC1155_RECEIVER,
        IID_ERC165,
        IID_ERC1271,
      ]) {
        expect(await account.supportsInterface(id), `interface ${id}`).to.equal(true);
      }

      expect(await account.supportsInterface("0xdeadbeef")).to.equal(false);
    });
  });

  describe("THE ACCEPTANCE TEST: value transfers with the NFT", function () {
    it("a loaded wallet changes hands when the NFT is sold", async function () {
      const { account, accountAddr, nft, usdg, usdgAddr, owner, alice, bob } =
        await loadFixture(deployAccountFixture);

      await usdg.mint(owner.address, 1_000n * 10n ** 6n);
      await usdg.transfer(accountAddr, 500n * 10n ** 6n);

      // Alice sells without emptying the wallet first.
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      // The tokens belong to the NFT, not to Alice.
      expect(await usdg.balanceOf(accountAddr)).to.equal(500n * 10n ** 6n);

      await expect(
        account.connect(alice).execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 1n), 0)
      ).to.be.revertedWithCustomError(account, "NotAuthorized");

      await account
        .connect(bob)
        .execute(usdgAddr, 0, encodeTransfer(usdg, bob.address, 500n * 10n ** 6n), 0);

      expect(await usdg.balanceOf(bob.address)).to.equal(500n * 10n ** 6n);
      expect(await usdg.balanceOf(accountAddr)).to.equal(0n);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
    });
  });

  describe("Ownership cycle guard", function () {
    it("refuses to receive the very NFT that controls it (safeTransferFrom)", async function () {
      const { account, accountAddr, nft, alice } = await loadFixture(deployAccountFixture);

      await expect(
        nft.connect(alice)["safeTransferFrom(address,address,uint256)"](alice.address, accountAddr, 1n)
      ).to.be.revertedWithCustomError(account, "OwnershipCycle");

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("still accepts a DIFFERENT token from the same collection", async function () {
      const { accountAddr, nft, bob } = await loadFixture(deployAccountFixture);

      // Oohdie #2 does not control this account, so holding it is fine.
      await nft.connect(bob)["safeTransferFrom(address,address,uint256)"](bob.address, accountAddr, 2n);

      expect(await nft.ownerOf(2n)).to.equal(accountAddr);
    });

    it("backstop: a plain transferFrom bypasses the hook, but execute then refuses to act", async function () {
      const { account, accountAddr, nft, alice, usdg, usdgAddr } =
        await loadFixture(deployAccountFixture);

      // transferFrom skips onERC721Received, so the cycle can still be created.
      await nft.connect(alice).transferFrom(alice.address, accountAddr, 1n);
      expect(await nft.ownerOf(1n)).to.equal(accountAddr);
      expect(await account.owner()).to.equal(accountAddr);

      await expect(
        account.connect(alice).execute(usdgAddr, 0, encodeTransfer(usdg, alice.address, 1n), 0)
      ).to.be.revertedWithCustomError(account, "OwnershipCycle");
    });
  });
});
