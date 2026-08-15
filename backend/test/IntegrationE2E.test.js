import { expect } from "chai";
import hre from "hardhat";

describe("Phase 6: Integration & End-To-End Workflows", function () {
  const DEFAULT_ACTIVATION_COST = 1_000n * 10n ** 18n;

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

  async function deployFullProtocolFixture() {
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
    const mockSymbols = [
      { name: "Apple Stock", symbol: "AAPLx", dec: 18 },
      { name: "Microsoft Stock", symbol: "MSFTx", dec: 18 },
      { name: "Nvidia Stock", symbol: "NVDAx", dec: 18 },
      { name: "Amazon Stock", symbol: "AMZNx", dec: 18 },
      { name: "Google Stock", symbol: "GOOGLx", dec: 18 },
      { name: "Meta Stock", symbol: "METAx", dec: 18 },
      { name: "Tesla Stock", symbol: "TSLAx", dec: 18 },
      { name: "Palantir Stock", symbol: "PLTRx", dec: 18 },
      { name: "AMD Stock", symbol: "AMDx", dec: 18 },
      { name: "GameStop Stock", symbol: "GMEx", dec: 18 },
      { name: "SpaceX Mock Stock", symbol: "SPCXx", dec: 18 },
      { name: "USD Global", symbol: "USDG", dec: 6 },
    ];

    const mocks = {};
    for (const item of mockSymbols) {
      const mock = await MockRewardToken.deploy(item.name, item.symbol, item.dec, owner.address);
      const mockAddr = await mock.getAddress();
      await engine.registerRewardAsset(mockAddr);
      mocks[item.symbol] = mock;
    }

    await engine.setFunder(funder.address, true);

    await banana.transfer(alice.address, 100_000n * 10n ** 18n);
    await banana.transfer(bob.address, 100_000n * 10n ** 18n);
    await banana.transfer(charlie.address, 100_000n * 10n ** 18n);

    return {
      banana,
      nft,
      activationController,
      engine,
      vault,
      mocks,
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

  describe("Part 1: Complete End-To-End Protocol Flow", function () {
    it("executes the full 25-step protocol lifecycle seamlessly", async function () {
      const { banana, nft, activationController, engine, vault, mocks, alice, bob, funder, networkHelpers } =
        await loadFixture(deployFullProtocolFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();

      await nft.mint(alice.address);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);

      const initialSupply = await banana.totalSupply();
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      expect(await banana.totalSupply()).to.equal(initialSupply - DEFAULT_ACTIVATION_COST);
      expect(await activationController.isActivated(1n)).to.be.true;

      const fundAmount = 1_000n * 10n ** 6n;
      const duration = 100n;
      await usdg.mint(funder.address, fundAmount * 2n);
      await usdg.connect(funder).approve(await engine.getAddress(), fundAmount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, fundAmount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);
      await engine.updateRewardForAsset(1n, usdgAddr);

      await usdg.connect(funder).approve(await vault.getAddress(), fundAmount);
      await vault.connect(funder).depositReward(usdgAddr, fundAmount);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const latestBlock1 = await ethers.provider.getBlock("latest");
      const elapsed1 = BigInt(latestBlock1.timestamp - fundBlock.timestamp);
      const expected1 = elapsed1 * (fundAmount / duration);

      const pending1 = await engine.getPendingReward(1n, usdgAddr);
      expect(pending1).to.be.closeTo(expected1, 20_000_000n);

      await usdg.mint(funder.address, fundAmount * 2n);
      await usdg.connect(funder).approve(await engine.getAddress(), fundAmount);
      await engine.connect(funder).fundReward(usdgAddr, fundAmount, duration);
      await usdg.connect(funder).approve(await vault.getAddress(), fundAmount);
      await vault.connect(funder).depositReward(usdgAddr, fundAmount);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const pending2 = await engine.getPendingReward(1n, usdgAddr);
      expect(pending2).to.be.greaterThan(pending1);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await expect(vault.connect(alice).claimReward(1n, usdgAddr)).to.be.revertedWithCustomError(
        vault,
        "NotNFTOwner"
      );

      const bobBalBefore = await usdg.balanceOf(bob.address);
      const vaultBalBefore = await vault.getVaultBalance(usdgAddr);

      await vault.connect(bob).claimReward(1n, usdgAddr);

      const bobBalAfter = await usdg.balanceOf(bob.address);
      const vaultBalAfter = await vault.getVaultBalance(usdgAddr);

      expect(bobBalAfter).to.be.greaterThan(bobBalBefore);
      expect(vaultBalAfter).to.be.lessThan(vaultBalBefore);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const claimableSecond = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(claimableSecond).to.be.greaterThan(0n);

      await vault.connect(bob).claimReward(1n, usdgAddr);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);
    });
  });

  describe("Part 2: Multi-NFT Earning & Transfer Order", function () {
    it("5 NFTs activated at staggered timestamps earn proportional rewards (NFT #1 > #2 > #3 > #4 > #5)", async function () {
      const { banana, nft, activationController, engine, vault, mocks, alice, bob, funder, networkHelpers } =
        await loadFixture(deployFullProtocolFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();

      for (let i = 1; i <= 5; i++) {
        await nft.mint(alice.address);
      }
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST * 5n);

      const amount = 5_000n * 10n ** 6n;
      await usdg.mint(funder.address, amount * 2n);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, 500n);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await activationController.connect(alice).activate(1n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();
      await activationController.connect(alice).activate(2n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();
      await activationController.connect(alice).activate(3n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();
      await activationController.connect(alice).activate(4n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();
      await activationController.connect(alice).activate(5n);

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const e1 = await engine.getTotalClaimableReward(1n, usdgAddr);
      const e2 = await engine.getTotalClaimableReward(2n, usdgAddr);
      const e3 = await engine.getTotalClaimableReward(3n, usdgAddr);
      const e4 = await engine.getTotalClaimableReward(4n, usdgAddr);
      const e5 = await engine.getTotalClaimableReward(5n, usdgAddr);

      expect(e1).to.be.greaterThan(e2);
      expect(e2).to.be.greaterThan(e3);
      expect(e3).to.be.greaterThan(e4);
      expect(e4).to.be.greaterThan(e5);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const e1AfterTransfer = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(e1AfterTransfer).to.be.greaterThanOrEqual(e1);
    });
  });

  describe("Part 3: Multi-Asset Isolation & Selective Claims", function () {
    it("accumulates AAPLx, NVDAx, and USDG independently; claiming one asset leaves others untouched", async function () {
      const { banana, nft, activationController, engine, vault, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployFullProtocolFixture);

      const aapl = mocks["AAPLx"];
      const nvda = mocks["NVDAx"];
      const usdg = mocks["USDG"];

      const aaplAddr = await aapl.getAddress();
      const nvdaAddr = await nvda.getAddress();
      const usdgAddr = await usdg.getAddress();

      await nft.mint(alice.address);
      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      const aaplAmount = 1_000n * 10n ** 18n;
      const nvdaAmount = 1_000n * 10n ** 18n;
      const usdgAmount = 1_000n * 10n ** 6n;

      await aapl.mint(funder.address, aaplAmount * 2n);
      await nvda.mint(funder.address, nvdaAmount * 2n);
      await usdg.mint(funder.address, usdgAmount * 2n);

      await aapl.connect(funder).approve(await engine.getAddress(), aaplAmount);
      const fundTxAAPL = await engine.connect(funder).fundReward(aaplAddr, aaplAmount, 100n);
      const fundBlockAAPL = await ethers.provider.getBlock(fundTxAAPL.blockNumber);
      await engine.updateRewardForAsset(1n, aaplAddr);
      await aapl.connect(funder).approve(await vault.getAddress(), aaplAmount);
      await vault.connect(funder).depositReward(aaplAddr, aaplAmount);

      await nvda.connect(funder).approve(await engine.getAddress(), nvdaAmount);
      const fundTxNVDA = await engine.connect(funder).fundReward(nvdaAddr, nvdaAmount, 100n);
      const fundBlockNVDA = await ethers.provider.getBlock(fundTxNVDA.blockNumber);
      await engine.updateRewardForAsset(1n, nvdaAddr);
      await nvda.connect(funder).approve(await vault.getAddress(), nvdaAmount);
      await vault.connect(funder).depositReward(nvdaAddr, nvdaAmount);

      await usdg.connect(funder).approve(await engine.getAddress(), usdgAmount);
      const fundTxUSDG = await engine.connect(funder).fundReward(usdgAddr, usdgAmount, 100n);
      const fundBlockUSDG = await ethers.provider.getBlock(fundTxUSDG.blockNumber);
      await engine.updateRewardForAsset(1n, usdgAddr);
      await usdg.connect(funder).approve(await vault.getAddress(), usdgAmount);
      await vault.connect(funder).depositReward(usdgAddr, usdgAmount);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsedAAPL = BigInt(latestBlock.timestamp - fundBlockAAPL.timestamp);
      const elapsedNVDA = BigInt(latestBlock.timestamp - fundBlockNVDA.timestamp);
      const elapsedUSDG = BigInt(latestBlock.timestamp - fundBlockUSDG.timestamp);

      const expectedAAPL = elapsedAAPL * (aaplAmount / 100n);
      const expectedNVDA = elapsedNVDA * (nvdaAmount / 100n);
      const expectedUSDG = elapsedUSDG * (usdgAmount / 100n);

      const aaplBefore = await engine.getTotalClaimableReward(1n, aaplAddr);
      const nvdaBefore = await engine.getTotalClaimableReward(1n, nvdaAddr);
      const usdgBefore = await engine.getTotalClaimableReward(1n, usdgAddr);

      expect(aaplBefore).to.equal(expectedAAPL);
      expect(nvdaBefore).to.equal(expectedNVDA);
      expect(usdgBefore).to.equal(expectedUSDG);

      await vault.connect(alice).claimReward(1n, aaplAddr);

      expect(await engine.getTotalClaimableReward(1n, aaplAddr)).to.equal(0n);
      expect(await engine.getTotalClaimableReward(1n, nvdaAddr)).to.be.greaterThanOrEqual(nvdaBefore);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.be.greaterThanOrEqual(usdgBefore);

      await vault.connect(alice).claimReward(1n, usdgAddr);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);
      expect(await engine.getTotalClaimableReward(1n, nvdaAddr)).to.be.greaterThanOrEqual(nvdaBefore);
    });
  });
});
