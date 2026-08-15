import { expect } from "chai";
import hre from "hardhat";

describe("RewardVault", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const DEFAULT_ACTIVATION_COST = 1_000n * 10n ** 18n;

  let connection;
  let ethers;
  let networkHelpers;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function deployVaultFixture() {
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

    const RewardVault = await ethers.getContractFactory("RewardVault");
    const vault = await RewardVault.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      owner.address
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
    await nft.mint(alice.address);
    await nft.mint(bob.address);

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
      RewardVault,
      ethers,
    };
  }

  async function loadFixture(fixture) {
    return networkHelpers.loadFixture(fixture);
  }

  describe("Deployment & Setup", function () {
    it("should deploy successfully", async function () {
      const { vault, nft, engine, owner } = await loadFixture(deployVaultFixture);
      expect(await vault.getAddress()).to.be.properAddress;
      expect(await vault.oohdiesNFT()).to.equal(await nft.getAddress());
      expect(await vault.earningEngine()).to.equal(await engine.getAddress());
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("reverts deployment with zero address for NFT or engine", async function () {
      const { engine, owner, RewardVault } = await loadFixture(deployVaultFixture);

      await expect(
        RewardVault.deploy(ZERO_ADDRESS, await engine.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(RewardVault, "ZeroAddressNotAllowed");

      await expect(
        RewardVault.deploy(await engine.getAddress(), ZERO_ADDRESS, owner.address)
      ).to.be.revertedWithCustomError(RewardVault, "ZeroAddressNotAllowed");
    });
  });

  describe("Funding & Deposits", function () {
    it("depositing rewards increases vault token balance and totalDeposited", async function () {
      const { vault, usdg, usdgAddr, funder } = await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);

      await expect(vault.connect(funder).depositReward(usdgAddr, amount))
        .to.emit(vault, "RewardDeposited")
        .withArgs(usdgAddr, funder.address, amount);

      expect(await usdg.balanceOf(await vault.getAddress())).to.equal(amount);
      expect(await vault.totalDeposited(usdgAddr)).to.equal(amount);
    });

    it("reverts deposit of zero amount or zero address asset", async function () {
      const { vault, usdgAddr, funder } = await loadFixture(deployVaultFixture);

      await expect(
        vault.connect(funder).depositReward(usdgAddr, 0n)
      ).to.be.revertedWithCustomError(vault, "ZeroAmountNotAllowed");

      await expect(
        vault.connect(funder).depositReward(ZERO_ADDRESS, 100n)
      ).to.be.revertedWithCustomError(vault, "ZeroAddressNotAllowed");
    });
  });

  describe("Withdrawal & Claiming", function () {
    it("current NFT owner can claim accrued rewards", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const balBefore = await usdg.balanceOf(alice.address);
      const claimTx = await vault.connect(alice).claimReward(1n, usdgAddr);
      const claimBlock = await ethers.provider.getBlock(claimTx.blockNumber);
      const balAfter = await usdg.balanceOf(alice.address);

      const elapsed = BigInt(claimBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / duration);

      expect(balAfter - balBefore).to.equal(expected);
    });

    it("non-owner cannot claim rewards for an NFT", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await expect(
        vault.connect(bob).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NotNFTOwner");
    });

    it("reverts claim if no rewards have accrued", async function () {
      const { vault, usdgAddr, alice } = await loadFixture(deployVaultFixture);
      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NoRewardToClaim");
    });
  });

  describe("NFT Transfers & TokenId Accounting", function () {
    it("previous owner cannot claim after transfer; new owner CAN claim", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NotNFTOwner");

      const bobBalBefore = await usdg.balanceOf(bob.address);
      await vault.connect(bob).claimReward(1n, usdgAddr);
      const bobBalAfter = await usdg.balanceOf(bob.address);

      const elapsed = BigInt(xferBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / duration);

      expect(bobBalAfter - bobBalBefore).to.equal(expected);
    });

    it("withdrawing one NFT does not affect another NFT", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(3n);

      await usdg.mint(funder.address, 2000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      await engine.updateRewardForAsset(1n, usdgAddr);
      await engine.updateRewardForAsset(3n, usdgAddr);
      const fundBlock = await ethers.provider.getBlock("latest");

      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await vault.connect(alice).claimReward(1n, usdgAddr);

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expectedBob = (elapsed * (1000n * 10n ** 6n / 100n)) / 2n;

      const bobClaimable = await engine.getTotalClaimableReward(3n, usdgAddr);
      expect(bobClaimable).to.be.closeTo(expectedBob, 10_000_000n);

      await vault.connect(bob).claimReward(3n, usdgAddr);
    });
  });

  describe("Batch Claiming & Multi-Asset", function () {
    it("claimAllRewards claims accrued rewards across all registered assets", async function () {
      const { banana, activationController, engine, vault, usdg, aapl, usdgAddr, aaplAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      const fundTxUSDG = await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      const fundBlockUSDG = await ethers.provider.getBlock(fundTxUSDG.blockNumber);
      await engine.updateRewardForAsset(1n, usdgAddr);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await aapl.mint(funder.address, 1000n * 10n ** 18n);
      await aapl.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 18n);
      const fundTxAAPL = await engine.connect(funder).fundReward(aaplAddr, 1000n * 10n ** 18n, 100n);
      const fundBlockAAPL = await ethers.provider.getBlock(fundTxAAPL.blockNumber);
      await engine.updateRewardForAsset(1n, aaplAddr);

      await aapl.mint(funder.address, 1000n * 10n ** 18n);
      await aapl.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 18n);
      await vault.connect(funder).depositReward(aaplAddr, 1000n * 10n ** 18n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      const usdgBalBefore = await usdg.balanceOf(alice.address);
      const aaplBalBefore = await aapl.balanceOf(alice.address);

      const claimTx = await vault.connect(alice).claimAllRewards(1n);
      const claimBlock = await ethers.provider.getBlock(claimTx.blockNumber);

      const usdgBalAfter = await usdg.balanceOf(alice.address);
      const aaplBalAfter = await aapl.balanceOf(alice.address);

      const elapsedUSDG = BigInt(claimBlock.timestamp - fundBlockUSDG.timestamp);
      const elapsedAAPL = BigInt(claimBlock.timestamp - fundBlockAAPL.timestamp);
      const expectedUSDG = elapsedUSDG * (1000n * 10n ** 6n / 100n);
      const expectedAAPL = elapsedAAPL * (1000n * 10n ** 18n / 100n);

      expect(usdgBalAfter - usdgBalBefore).to.equal(expectedUSDG);
      expect(aaplBalAfter - aaplBalBefore).to.equal(expectedAAPL);
    });
  });

  describe("Invariants & Security", function () {
    it("INVARIANT: actual vault balance must always back claimable withdrawals", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "InsufficientVaultBalance");
    });

    it("vault owner CANNOT steal or withdraw user reward allocations", async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      const iface = vault.interface;
      const functionNames = iface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(functionNames).to.not.include("sweep");
      expect(functionNames).to.not.include("withdrawAdmin");
      expect(functionNames).to.not.include("emergencyWithdraw");
      expect(functionNames).to.not.include("withdrawTokens");
    });

    it("pause halts claims and deposits, unpause resumes operations without modifying balances", async function () {
      const { vault, usdg, usdgAddr, funder, alice } = await loadFixture(deployVaultFixture);

      await vault.pause();

      await usdg.mint(funder.address, 100n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 100n * 10n ** 6n);

      await expect(
        vault.connect(funder).depositReward(usdgAddr, 100n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.unpause();

      const tx = vault.connect(funder).depositReward(usdgAddr, 100n * 10n ** 6n);
      await expect(tx).to.emit(vault, "RewardDeposited").withArgs(usdgAddr, funder.address, 100n * 10n ** 6n);
    });
  });
});
