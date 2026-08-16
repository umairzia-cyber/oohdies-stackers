import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry } from "./helpers/erc6551.js";

describe("Activation Reset On Transfer & Transfer Freeze Prevention", function () {
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

  async function deployResetFixture() {
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

    const aaplAddr = await aapl.getAddress();
    const usdgAddr = await usdg.getAddress();

    await engine.registerRewardAsset(aaplAddr);
    await engine.registerRewardAsset(usdgAddr);

    await engine.setFunder(funder.address, true);

    await banana.transfer(alice.address, 100_000n * 10n ** 18n);
    await banana.transfer(bob.address, 100_000n * 10n ** 18n);
    await banana.transfer(charlie.address, 100_000n * 10n ** 18n);

    await nft.mint(alice.address);

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
      attacker,
      networkHelpers,
      ethers,
    };
  }

  describe("Activation Reset On Transfer", function () {
    it("activated NFT becomes inactive after transfer and decrements totalActivated", async function () {
      const { banana, nft, activationController, alice, bob } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      expect(await activationController.isActivated(1n)).to.be.true;
      expect(await activationController.totalActivated()).to.equal(1n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await activationController.isActivated(1n)).to.be.false;
      expect(await activationController.getActivatedAt(1n)).to.equal(0n);
      expect(await activationController.totalActivated()).to.equal(0n);
    });

    it("previous owner cannot reactivate after losing ownership", async function () {
      const { banana, nft, activationController, alice, bob } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST * 2n);
      await activationController.connect(alice).activate(1n, PICKS);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await expect(
        activationController.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(activationController, "NotNFTOwner");
    });

    it("new owner cannot earn rewards before reactivation", async function () {
      const { banana, nft, activationController, engine, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 5000n * 10n ** 6n, 500n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
    });

    it("new owner can reactivate by burning BANANA, starting a fresh earning period", async function () {
      const { banana, nft, activationController, engine, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 5000n * 10n ** 6n, 500n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      const initialSupply = await banana.totalSupply();
      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n, PICKS);

      expect(await banana.totalSupply()).to.equal(initialSupply - DEFAULT_ACTIVATION_COST);
      expect(await activationController.isActivated(1n)).to.be.true;

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const pending = await engine.getPendingReward(1n, usdgAddr);
      expect(pending).to.be.closeTo(200n * 10n ** 6n, 30n * 10n ** 6n);
    });

    it("multiple transfers require repeated activations (Alice -> Bob -> Charlie)", async function () {
      const { banana, nft, activationController, alice, bob, charlie } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);
      expect(await activationController.isActivated(1n)).to.be.true;

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await activationController.isActivated(1n)).to.be.false;

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n, PICKS);
      expect(await activationController.isActivated(1n)).to.be.true;

      await nft.connect(bob).transferFrom(bob.address, charlie.address, 1n);
      expect(await activationController.isActivated(1n)).to.be.false;

      await banana.connect(charlie).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(charlie).activate(1n, PICKS);
      expect(await activationController.isActivated(1n)).to.be.true;
    });
  });

  describe("Reward Preservation & Claim Authorization", function () {
    it("rewards earned before transfer remain attached to tokenId; only the new owner can spend them, even while inactive", async function () {
      const { banana, nft, activationController, engine, vault, usdg, aapl, usdgAddr, aaplAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 6n);
      const fundTxUSDG = await engine.connect(funder).fundReward(usdgAddr, 5000n * 10n ** 6n, 500n);
      const fundBlockUSDG = await ethers.provider.getBlock(fundTxUSDG.blockNumber);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 5000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 5000n * 10n ** 6n);

      await aapl.mint(funder.address, 5000n * 10n ** 18n);
      await aapl.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 18n);
      await engine.connect(funder).fundReward(aaplAddr, 5000n * 10n ** 18n, 500n);
      await aapl.mint(funder.address, 5000n * 10n ** 18n);
      await aapl.connect(funder).approve(await vault.getAddress(), 5000n * 10n ** 18n);
      await vault.connect(funder).depositReward(aaplAddr, 5000n * 10n ** 18n);

      await networkHelpers.time.increase(30);
      await networkHelpers.mine();

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);
      expect(await activationController.isActivated(1n)).to.be.false;

      const walletAddr = await vault.accountOf(1n);
      const walletBalBefore = await usdg.balanceOf(walletAddr);
      await vault.connect(bob).claimReward(1n, usdgAddr);
      const walletBalAfter = await usdg.balanceOf(walletAddr);

      const elapsed = BigInt(xferBlock.timestamp - fundBlockUSDG.timestamp);
      const expected = elapsed * (5000n * 10n ** 6n / 500n);

      expect(walletBalAfter - walletBalBefore).to.equal(expected);

      // Rewards stayed with the tokenId; only its new holder can spend them.
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
      await vault.createAccount(1n);
      const wallet = await ethers.getContractAt("OohdiesAccount", walletAddr);
      await expect(
        wallet
          .connect(alice)
          .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [alice.address, expected]), 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");

      await wallet
        .connect(bob)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [bob.address, expected]), 0);
      expect(await usdg.balanceOf(bob.address)).to.equal(expected);
    });

    it("new owner can claim pre-transfer rewards and earn new rewards after reactivation", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 5000n * 10n ** 6n, 500n);
      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 5000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 5000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n, PICKS);

      await networkHelpers.time.increase(30);
      await networkHelpers.mine();

      const totalClaimable = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(totalClaimable).to.be.closeTo(500n * 10n ** 6n, 60n * 10n ** 6n);

      await vault.connect(bob).claimReward(1n, usdgAddr);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);
    });
  });

  describe("Transfer While EarningEngine is Paused (Transfer-Freeze Fix)", function () {
    it("NFT transfer succeeds even when EarningEngine is paused; accrued rewards remain safe", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 5000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 5000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 5000n * 10n ** 6n, 500n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await engine.pause();

      const tx = nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      await expect(tx).to.emit(nft, "Transfer").withArgs(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await activationController.isActivated(1n)).to.be.false;

      await engine.unpause();

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n, PICKS);

      expect(await activationController.isActivated(1n)).to.be.true;
    });
  });

  describe("Security & Constraints", function () {
    it("unauthorized user cannot call deactivateOnTransfer", async function () {
      const { activationController, attacker } = await loadFixture(deployResetFixture);
      await expect(
        activationController.connect(attacker).deactivateOnTransfer(1n)
      ).to.be.revertedWithCustomError(activationController, "OnlyNFTContractAllowed");
    });

    it("totalActivated strictly reflects the number of currently active NFTs", async function () {
      const { banana, nft, activationController, alice, bob } = await loadFixture(deployResetFixture);

      await nft.mint(alice.address);

      expect(await activationController.totalActivated()).to.equal(0n);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST * 2n);
      await activationController.connect(alice).activate(1n, PICKS);
      await activationController.connect(alice).activate(2n, PICKS);

      expect(await activationController.totalActivated()).to.equal(2n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await activationController.totalActivated()).to.equal(1n);
    });
  });

  describe("Focused Security Review: 7 Failure & Revert Scenarios", function () {
    it("Scenario 1: Both hooks succeed normally — All 9 invariants hold", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await activationController.isActivated(1n)).to.be.false;
      expect(await activationController.totalActivated()).to.equal(0n);

      const elapsed = BigInt(xferBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (1000n * 10n ** 6n / 100n);

      expect(await engine.getAccruedReward(1n, usdgAddr)).to.equal(expected);

      const walletAddr = await vault.accountOf(1n);
      const walletBalBefore = await usdg.balanceOf(walletAddr);
      await vault.connect(bob).claimReward(1n, usdgAddr);
      expect((await usdg.balanceOf(walletAddr)) - walletBalBefore).to.equal(expected);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
    });

    it("Scenario 2: EarningEngine is paused during transfer — Transfer succeeds and rewards are safely preserved", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);
      await engine.updateRewardForAsset(1n, usdgAddr);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await engine.updateRewardForAsset(1n, usdgAddr);
      await engine.pause();

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await activationController.isActivated(1n)).to.be.false;

      await engine.unpause();

      const walletAddr = await vault.accountOf(1n);
      const walletBalBefore = await usdg.balanceOf(walletAddr);
      await vault.connect(bob).claimReward(1n, usdgAddr);

      const claimedAmount = (await usdg.balanceOf(walletAddr)) - walletBalBefore;
      expect(claimedAmount).to.be.greaterThan(0n);
    });

    it("Scenario 3: EarningEngine set to invalid/reverting address — Transfer succeeds without corruption", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, owner } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await nft.connect(owner).setEarningEngine(await banana.getAddress());

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await activationController.isActivated(1n)).to.be.false;

      await nft.connect(owner).setEarningEngine(await engine.getAddress());
    });

    it("Scenario 4: ActivationController.deactivateOnTransfer succeeds normally", async function () {
      const { banana, nft, activationController, alice, bob } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      expect(await activationController.isActivated(1n)).to.be.true;

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await activationController.isActivated(1n)).to.be.false;
      expect(await activationController.totalActivated()).to.equal(0n);
    });

    it("Scenario 5: ActivationController set to invalid/reverting address — Transfer succeeds safely", async function () {
      const { banana, nft, activationController, alice, bob, owner } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await nft.connect(owner).setActivationController(await banana.getAddress());

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);

      await nft.connect(owner).setActivationController(await activationController.getAddress());
    });

    it("Scenario 6: Both external hooks fail — Transfer succeeds cleanly without freezing NFT", async function () {
      const { banana, nft, activationController, alice, bob, owner } = await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await nft.connect(owner).setEarningEngine(await banana.getAddress());
      await nft.connect(owner).setActivationController(await banana.getAddress());

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("Scenario 7: Only one hook fails (EarningEngine fails, ActivationController succeeds) — State is consistent", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, owner, networkHelpers } =
        await loadFixture(deployResetFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      await engine.updateRewardForAsset(1n, usdgAddr);
      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await engine.updateRewardForAsset(1n, usdgAddr);
      await nft.connect(owner).setEarningEngine(await banana.getAddress());

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await activationController.isActivated(1n)).to.be.false;

      await nft.connect(owner).setEarningEngine(await engine.getAddress());

      const walletAddr = await vault.accountOf(1n);
      const walletBalBefore = await usdg.balanceOf(walletAddr);
      await vault.connect(bob).claimReward(1n, usdgAddr);
      expect((await usdg.balanceOf(walletAddr)) - walletBalBefore).to.be.closeTo(
        260n * 10n ** 6n,
        50n * 10n ** 6n
      );
    });
  });
});
