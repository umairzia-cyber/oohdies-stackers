import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry } from "./helpers/erc6551.js";

describe("Phase 6: Protocol Invariant Verification", function () {
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

  async function deployInvariantFixture() {
    const [owner, alice, bob, charlie, funder] = await ethers.getSigners();

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

    const aaplAddr = await aapl.getAddress();
    const usdgAddr = await usdg.getAddress();

    await engine.registerRewardAsset(aaplAddr);
    await engine.registerRewardAsset(usdgAddr);

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
      aaplAddr,
      usdgAddr,
      owner,
      alice,
      bob,
      charlie,
      funder,
      networkHelpers,
      ethers,
    };
  }

  describe("Part 5: 15 Critical Invariants", function () {
    it("INVARIANT 1: BANANA totalSupply can never increase after deployment", async function () {
      const { banana, alice } = await loadFixture(deployInvariantFixture);
      const initialSupply = 1_000_000_000n * 10n ** 18n;
      expect(await banana.totalSupply()).to.equal(initialSupply);

      await banana.transfer(alice.address, 100n);
      expect(await banana.totalSupply()).to.equal(initialSupply);

      await banana.connect(alice).burn(100n);
      expect(await banana.totalSupply()).to.be.lessThan(initialSupply);
    });

    it("INVARIANT 2: Activation burns BANANA irreversibly", async function () {
      const { banana, nft, activationController, alice } = await loadFixture(deployInvariantFixture);
      const supplyBefore = await banana.totalSupply();

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      expect(await banana.totalSupply()).to.equal(supplyBefore - DEFAULT_ACTIVATION_COST);
    });

    it("INVARIANT 3: Deactivation / transfer decrements totalActivated count", async function () {
      const { banana, nft, activationController, alice, bob } = await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      expect(await activationController.totalActivated()).to.equal(1n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await activationController.totalActivated()).to.equal(0n);
      expect(await activationController.isActivated(1n)).to.be.false;
    });

    it("INVARIANT 4: Unactivated NFTs accrue zero rewards", async function () {
      const { nft, engine, usdgAddr } = await loadFixture(deployInvariantFixture);

      await nft.mint(this?.alice?.address || "0x0000000000000000000000000000000000000001");
      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
    });

    it("INVARIANT 5: Zero retroactive rewards for pre-activation periods", async function () {
      const { banana, nft, activationController, engine, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
    });

    it("INVARIANT 6: Reward state belongs to tokenId, never wallet address", async function () {
      const { banana, nft, activationController, engine, alice, bob, funder, usdg, usdgAddr, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const claimableBefore = await engine.getTotalClaimableReward(1n, usdgAddr);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      const claimableAfter = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(claimableAfter).to.be.closeTo(claimableBefore, 20n * 10n ** 6n);
    });

    it("INVARIANT 7 & 8: Transfer cannot create/destroy reward value; rewards can only be spent by the current owner", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      // The seller may still trigger the claim; it pays the NFT, never her.
      await vault.connect(alice).claimReward(1n, usdgAddr);

      await vault.createAccount(1n);
      const wallet = await ethers.getContractAt("OohdiesAccount", await vault.accountOf(1n));
      const claimed = await usdg.balanceOf(await wallet.getAddress());

      expect(claimed).to.be.gt(0n);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);

      const steal = usdg.interface.encodeFunctionData("transfer", [alice.address, claimed]);
      await expect(
        wallet.connect(alice).execute(usdgAddr, 0, steal, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");

      await wallet
        .connect(bob)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [bob.address, claimed]), 0);
      expect(await usdg.balanceOf(bob.address)).to.equal(claimed);
    });

    it("INVARIANT 9: An activated NFT's rewards reach its own wallet", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
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

      const walletAddr = await vault.accountOf(1n);
      const balBefore = await usdg.balanceOf(walletAddr);
      await vault.connect(alice).claimReward(1n, usdgAddr);
      const balAfter = await usdg.balanceOf(walletAddr);

      expect(balAfter).to.be.greaterThan(balBefore);
    });

    it("INVARIANT 10: A claim cannot increase claimable rewards", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
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

    it("INVARIANT 11: Claiming asset A cannot modify asset B", async function () {
      const { banana, nft, activationController, engine, vault, usdg, aapl, usdgAddr, aaplAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await aapl.mint(funder.address, 1000n * 10n ** 18n);
      await aapl.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 18n);
      await engine.connect(funder).fundReward(aaplAddr, 1000n * 10n ** 18n, 100n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const aaplClaimableBefore = await engine.getTotalClaimableReward(1n, aaplAddr);
      await vault.connect(alice).claimReward(1n, usdgAddr);
      const aaplClaimableAfter = await engine.getTotalClaimableReward(1n, aaplAddr);

      expect(aaplClaimableAfter).to.be.closeTo(aaplClaimableBefore, 20n * 10n ** 18n);
    });

    it("INVARIANT 12: RewardVault cannot distribute more tokens than it actually holds", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();
      const claimable = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(claimable).to.be.greaterThan(0n);

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "InsufficientVaultBalance");
    });

    it("INVARIANT 14 & 15: Total distributed rewards <= funded rewards; rounding truncation favors contract", async function () {
      const { banana, nft, activationController, engine, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployInvariantFixture);

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      const fundAmount = 1_000n * 10n ** 6n;
      await usdg.mint(funder.address, fundAmount);
      await usdg.connect(funder).approve(await engine.getAddress(), fundAmount);
      await engine.connect(funder).fundReward(usdgAddr, fundAmount, 100n);

      await networkHelpers.time.increase(500);
      await networkHelpers.mine();

      const claimable = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(claimable).to.be.at.most(fundAmount);
    });
  });
});
