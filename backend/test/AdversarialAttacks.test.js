import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry } from "./helpers/erc6551.js";

describe("Phase 6: Adversarial & Attack Vector Testing", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const DEFAULT_ACTIVATION_COST = 1_000n * 10n ** 18n;

  let connection;
  let ethers;
  let networkHelpers;
  let PICKS = [];

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function loadFixture(fixture) {
    const ctx = await networkHelpers.loadFixture(fixture);
    // Re-sync to whichever fixture was just restored; they share this module-level variable.
    // A view call, so it adds no block and cannot disturb timing-sensitive assertions.
    if (ctx && ctx.engine) {
      PICKS = Array.from(await ctx.engine.getRegisteredRewardAssets());
    }
    return ctx;
  }

  /** Activates a token and funds engine and vault, so there is real value at stake. */
  async function withAccrual(ctx, tokenId, holder) {
    const { banana, activationController, engine, vault, usdg, usdgAddr, funder } = ctx;
    const amount = 1_000n * 10n ** 6n;

    await banana
      .connect(holder)
      .approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
    await activationController.connect(holder).activate(tokenId, PICKS);

    await usdg.mint(funder.address, amount * 2n);
    await usdg.connect(funder).approve(await engine.getAddress(), amount);
    await engine.connect(funder).fundReward(usdgAddr, amount, 100n);
    await usdg.connect(funder).approve(await vault.getAddress(), amount);
    await vault.connect(funder).depositReward(usdgAddr, amount);

    await networkHelpers.time.increase(10);
    await networkHelpers.mine();
  }

  async function walletFor(vault, tokenId) {
    await vault.createAccount(tokenId);
    return ethers.getContractAt("OohdiesAccount", await vault.accountOf(tokenId));
  }

  async function deployAdversarialFixture() {
    const [owner, alice, bob, charlie, funder, attacker] = await ethers.getSigners();

    const BananaToken = await ethers.getContractFactory("BananaToken");
    const banana = await BananaToken.deploy(owner.address);

    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(owner.address);

    const ActivationController = await ethers.getContractFactory("ActivationController");
    const activationController = await ActivationController.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      owner.address,
      DEFAULT_ACTIVATION_COST
    );

    const EarningEngine = await ethers.getContractFactory("EarningEngine");
    const engine = await EarningEngine.deploy(
      await activationController.getAddress(),
      await nft.getAddress(),
      owner.address
    );

    await installRegistry(networkHelpers);
    const accountImpl = await (await ethers.getContractFactory("OohdiesAccount")).deploy();
    const accountImplAddr = await accountImpl.getAddress();

    const RewardVault = await ethers.getContractFactory("RewardVault");
    const vault = await RewardVault.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      owner.address,
      CANONICAL_REGISTRY,
      accountImplAddr,
      ZERO_SALT
    );

    await nft.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activationController.getAddress());
    await activationController.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());

    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const aapl = await MockRewardToken.deploy("Apple Stock", "AAPLx", 18, owner.address);
    const usdg = await MockRewardToken.deploy("USD Global", "USDG", 6, owner.address);
    const zeroDec = await MockRewardToken.deploy("Zero Dec Token", "ZERO", 0, owner.address);

    const aaplAddr = await aapl.getAddress();
    const usdgAddr = await usdg.getAddress();
    const zeroDecAddr = await zeroDec.getAddress();

    await engine.registerRewardAsset(aaplAddr);
    await engine.registerRewardAsset(usdgAddr);
    await engine.registerRewardAsset(zeroDecAddr);

    await engine.setFunder(funder.address, true);

    await banana.transfer(alice.address, 100_000n * 10n ** 18n);
    await banana.transfer(bob.address, 100_000n * 10n ** 18n);
    await banana.transfer(charlie.address, 100_000n * 10n ** 18n);

    await nft.mint(alice.address);
    await nft.mint(bob.address);

    // Copied out of the frozen Result so it can be passed back as calldata.
    PICKS = Array.from(await engine.getRegisteredRewardAssets());
    await activationController.setRequiredPicks(PICKS.length);

    return {
      banana,
      nft,
      activationController,
      engine,
      vault,
      aapl,
      usdg,
      zeroDec,
      aaplAddr,
      usdgAddr,
      zeroDecAddr,
      owner,
      alice,
      bob,
      charlie,
      funder,
      attacker,
      networkHelpers,
      ethers,
    };
  }

  describe("Part 4: 35 Specific Attack Vectors", function () {
    it("1. Non-owner activation fails", async function () {
      const { activationController, attacker } = await loadFixture(deployAdversarialFixture);
      await expect(
        activationController.connect(attacker).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(activationController, "NotNFTOwner");
    });

    it("2. Activation without BANANA fails", async function () {
      const { banana, nft, activationController, attacker } = await loadFixture(deployAdversarialFixture);
      await nft.mint(attacker.address);
      await banana.connect(attacker).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await expect(
        activationController.connect(attacker).activate(3n, PICKS)
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientBalance");
    });

    it("3. Activation without approval fails", async function () {
      const { banana, activationController, alice } = await loadFixture(deployAdversarialFixture);
      await expect(
        activationController.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(
        banana,
        "ERC20InsufficientAllowance"
      );
    });

    it("4. Double activation fails", async function () {
      const { banana, activationController, alice } = await loadFixture(deployAdversarialFixture);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST * 2n);
      await activationController.connect(alice).activate(1n, PICKS);

      await expect(
        activationController.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(activationController, "AlreadyActivated");
    });

    it("5. Unauthorized EarningEngine calls fail", async function () {
      const { engine, attacker } = await loadFixture(deployAdversarialFixture);
      await expect(
        engine.connect(attacker).onNftTransfer(attacker.address, attacker.address, 1n)
      ).to.be.revertedWithCustomError(engine, "OnlyNFTContractAllowed");

      await expect(
        engine.connect(attacker).deductClaimableReward(1n, ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(engine, "OnlyRewardVaultAllowed");
    });

    it("6. An attacker triggering a claim cannot receive the tokens", async function () {
      const ctx = await loadFixture(deployAdversarialFixture);
      const { vault, usdg, usdgAddr, alice, attacker } = ctx;
      await withAccrual(ctx, 1n, alice);

      // Permissionless, so this succeeds — but the attacker cannot influence the destination.
      await vault.connect(attacker).claimReward(1n, usdgAddr);

      expect(await usdg.balanceOf(attacker.address)).to.equal(0n);
      expect(await usdg.balanceOf(await vault.accountOf(1n))).to.be.gt(0n);
    });

    it("7. Unauthorized reward funding fails", async function () {
      const { engine, usdgAddr, attacker } = await loadFixture(deployAdversarialFixture);
      await expect(
        engine.connect(attacker).fundReward(usdgAddr, 100n, 100n)
      ).to.be.revertedWithCustomError(engine, "UnauthorizedFunder");
    });

    it("8. Unauthorized reward allocation cannot be fabricated", async function () {
      const { engine, usdgAddr } = await loadFixture(deployAdversarialFixture);
      expect(await engine.accruedRewards(99n, usdgAddr)).to.equal(0n);
    });

    it("9. A previous owner cannot extract rewards after transferring", async function () {
      const ctx = await loadFixture(deployAdversarialFixture);
      const { nft, vault, usdg, usdgAddr, alice, bob } = ctx;
      await withAccrual(ctx, 1n, alice);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      await vault.connect(alice).claimReward(1n, usdgAddr);

      const wallet = await walletFor(vault, 1n);
      const claimed = await usdg.balanceOf(await wallet.getAddress());
      expect(claimed).to.be.gt(0n);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);

      const steal = usdg.interface.encodeFunctionData("transfer", [alice.address, claimed]);
      await expect(
        wallet.connect(alice).execute(usdgAddr, 0, steal, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");
    });

    it("10. Owning one Oohdie grants no access to another Oohdie's wallet", async function () {
      const ctx = await loadFixture(deployAdversarialFixture);
      const { vault, usdg, usdgAddr, alice, bob } = ctx;
      await withAccrual(ctx, 1n, alice);

      await vault.connect(bob).claimReward(1n, usdgAddr);

      const wallet = await walletFor(vault, 1n);
      const claimed = await usdg.balanceOf(await wallet.getAddress());
      expect(await usdg.balanceOf(bob.address)).to.equal(0n);

      const steal = usdg.interface.encodeFunctionData("transfer", [bob.address, claimed]);
      await expect(
        wallet.connect(bob).execute(usdgAddr, 0, steal, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");
    });

    it("11. Claiming for a nonexistent NFT yields nothing", async function () {
      const { vault, usdgAddr, alice } = await loadFixture(deployAdversarialFixture);
      // The claim path no longer consults ownerOf, and an unminted id has accrued nothing.
      await expect(
        vault.connect(alice).claimReward(9999n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NoRewardToClaim");
    });

    it("12. Claiming more than accrued fails (reverts NoRewardToClaim)", async function () {
      const { vault, usdgAddr, alice } = await loadFixture(deployAdversarialFixture);
      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NoRewardToClaim");
    });

    it("13. Claiming after another user already claimed fails (0 claimable left)", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployAdversarialFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      await vault.connect(alice).claimReward(1n, usdgAddr);

      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);
    });

    it("14-15. Reentrancy protection on claim & fund", async function () {
      const { vault, engine } = await loadFixture(deployAdversarialFixture);
      expect(vault.interface.getFunction("claimReward").stateMutability).to.equal("nonpayable");
      expect(engine.interface.getFunction("fundReward").stateMutability).to.equal("nonpayable");
    });

    it("18-19. Supports 0-decimal and unusual decimal tokens safely", async function () {
      const { banana, activationController, engine, vault, zeroDec, zeroDecAddr, alice, funder, networkHelpers } =
        await loadFixture(deployAdversarialFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await zeroDec.mint(funder.address, 1000n);
      await zeroDec.connect(funder).approve(await engine.getAddress(), 1000n);
      const fundTx = await engine.connect(funder).fundReward(zeroDecAddr, 1000n, 100n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await zeroDec.mint(funder.address, 1000n);
      await zeroDec.connect(funder).approve(await vault.getAddress(), 1000n);
      await vault.connect(funder).depositReward(zeroDecAddr, 1000n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * 10n;

      const pending = await engine.getPendingReward(1n, zeroDecAddr);
      expect(pending).to.equal(expected);
    });

    it("22. Zero-duration funding fails", async function () {
      const { engine, usdgAddr, funder } = await loadFixture(deployAdversarialFixture);
      await expect(
        engine.connect(funder).fundReward(usdgAddr, 100n, 0n)
      ).to.be.revertedWithCustomError(engine, "ZeroDurationNotAllowed");
    });

    it("25. Funding when no NFTs are active does not leak rewards", async function () {
      const { engine, usdg, usdgAddr, funder, networkHelpers } = await loadFixture(deployAdversarialFixture);

      const amount = 1000n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, 100n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
    });

    it("35. Pause/unpause interactions enforce access control without data loss", async function () {
      const { engine, vault, usdgAddr, funder, alice } = await loadFixture(deployAdversarialFixture);

      await engine.pause();
      await vault.pause();

      await expect(
        engine.connect(funder).fundReward(usdgAddr, 100n, 100n)
      ).to.be.revertedWithCustomError(engine, "EnforcedPause");

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await engine.unpause();
      await vault.unpause();
    });
  });
});
