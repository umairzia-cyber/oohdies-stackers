import { expect } from "chai";
import hre from "hardhat";

describe("EarningEngine + Mock Reward Tokens", function () {
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

  async function deployEngineFixture() {
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

    await nft.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activationController.getAddress());
    await activationController.setEarningEngine(await engine.getAddress());

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

    await nft.mint(alice.address);
    await nft.mint(alice.address);
    await nft.mint(bob.address);

    return {
      banana,
      nft,
      activationController,
      engine,
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

  async function loadFixture(fixture) {
    return networkHelpers.loadFixture(fixture);
  }

  describe("Part A — Mock Reward Tokens", function () {
    it("should deploy all 12 mock reward tokens with correct names, symbols, and decimals", async function () {
      const { mocks } = await loadFixture(deployEngineFixture);

      const expectedList = [
        { symbol: "AAPLx", decimals: 18 },
        { symbol: "MSFTx", decimals: 18 },
        { symbol: "NVDAx", decimals: 18 },
        { symbol: "AMZNx", decimals: 18 },
        { symbol: "GOOGLx", decimals: 18 },
        { symbol: "METAx", decimals: 18 },
        { symbol: "TSLAx", decimals: 18 },
        { symbol: "PLTRx", decimals: 18 },
        { symbol: "AMDx", decimals: 18 },
        { symbol: "GMEx", decimals: 18 },
        { symbol: "SPCXx", decimals: 18 },
        { symbol: "USDG", decimals: 6 },
      ];

      for (const item of expectedList) {
        const token = mocks[item.symbol];
        expect(await token.symbol()).to.equal(item.symbol);
        expect(await token.decimals()).to.equal(item.decimals);
      }
    });

    it("owner can mint mock tokens for test funding", async function () {
      const { mocks, alice } = await loadFixture(deployEngineFixture);
      const token = mocks["USDG"];
      const amount = 5_000n * 10n ** 6n;

      await token.mint(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("non-owner cannot mint mock tokens", async function () {
      const { mocks, alice, bob } = await loadFixture(deployEngineFixture);
      const token = mocks["AAPLx"];
      await expect(
        token.connect(alice).mint(bob.address, 100n)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Part B — EarningEngine Deployment & Registration", function () {
    it("should deploy successfully and reference correct contracts", async function () {
      const { engine, activationController, nft } = await loadFixture(deployEngineFixture);
      expect(await engine.activationController()).to.equal(await activationController.getAddress());
      expect(await engine.oohdiesNFT()).to.equal(await nft.getAddress());
    });

    it("should list all 12 registered reward assets", async function () {
      const { engine } = await loadFixture(deployEngineFixture);
      const assets = await engine.getRegisteredRewardAssets();
      expect(assets.length).to.equal(12);
    });

    it("should revert registering zero address asset", async function () {
      const { engine } = await loadFixture(deployEngineFixture);
      await expect(
        engine.registerRewardAsset(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(engine, "ZeroAddressNotAllowed");
    });

    it("should revert registering duplicate reward asset", async function () {
      const { engine, mocks } = await loadFixture(deployEngineFixture);
      const usdg = await mocks["USDG"].getAddress();
      await expect(
        engine.registerRewardAsset(usdg)
      ).to.be.revertedWithCustomError(engine, "AssetAlreadyRegistered");
    });
  });

  describe("Reward Funding & Access Control", function () {
    it("authorized funder can fund rewards", async function () {
      const { engine, mocks, funder, ethers } = await loadFixture(deployEngineFixture);
      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);

      const blockBefore = await ethers.provider.getBlock("latest");
      await expect(engine.connect(funder).fundReward(usdgAddr, amount, duration))
        .to.emit(engine, "RewardFunded");

      const info = await engine.rewardAssets(usdgAddr);
      expect(info.totalFunded).to.equal(amount);
      expect(info.rewardRate).to.equal(amount / duration);
    });

    it("unauthorized user cannot fund rewards", async function () {
      const { engine, mocks, attacker } = await loadFixture(deployEngineFixture);
      const usdgAddr = await mocks["USDG"].getAddress();

      await expect(
        engine.connect(attacker).fundReward(usdgAddr, 1000n, 100n)
      ).to.be.revertedWithCustomError(engine, "UnauthorizedFunder");
    });

    it("should revert funding with zero amount", async function () {
      const { engine, mocks, funder } = await loadFixture(deployEngineFixture);
      const usdgAddr = await mocks["USDG"].getAddress();
      await expect(
        engine.connect(funder).fundReward(usdgAddr, 0n, 100n)
      ).to.be.revertedWithCustomError(engine, "ZeroAmountNotAllowed");
    });

    it("should revert funding with zero duration", async function () {
      const { engine, mocks, funder } = await loadFixture(deployEngineFixture);
      const usdgAddr = await mocks["USDG"].getAddress();
      await expect(
        engine.connect(funder).fundReward(usdgAddr, 1000n, 0n)
      ).to.be.revertedWithCustomError(engine, "ZeroDurationNotAllowed");
    });

    it("should revert funding unregistered asset", async function () {
      const { engine, funder } = await loadFixture(deployEngineFixture);
      await expect(
        engine.connect(funder).fundReward(ZERO_ADDRESS, 1000n, 100n)
      ).to.be.revertedWithCustomError(engine, "AssetNotRegistered");
    });
  });

  describe("Accrual Math, Activation & Retroactive Protection", function () {
    it("inactive NFT earns zero rewards", async function () {
      const { engine, mocks, funder } = await loadFixture(deployEngineFixture);
      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();

      const amount = 1_000n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, 100n);

      const { networkHelpers } = await hre.network.create();
      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
      expect(await engine.getAccruedReward(1n, usdgAddr)).to.equal(0n);
      expect(await engine.getTotalClaimableReward(1n, usdgAddr)).to.equal(0n);
    });

    it("activated NFT earns rewards correctly", async function () {
      const { banana, activationController, engine, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / duration);

      const pending = await engine.getPendingReward(1n, usdgAddr);
      expect(pending).to.equal(expected);
    });

    it("activation time is respected — NO retroactive rewards", async function () {
      const { banana, activationController, engine, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actTx = await activationController.connect(alice).activate(1n);
      const actBlock = await ethers.provider.getBlock(actTx.blockNumber);

      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - actBlock.timestamp);
      const expected = elapsed * (amount / duration);

      const pending = await engine.getPendingReward(1n, usdgAddr);
      expect(pending).to.equal(expected);
    });

    it("two active NFTs share rewards proportionally and independently", async function () {
      const { banana, activationController, engine, mocks, alice, bob, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const aapl = mocks["AAPLx"];
      const aaplAddr = await aapl.getAddress();
      const amount = 1_000n * 10n ** 18n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(3n);

      await aapl.mint(funder.address, amount);
      await aapl.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(aaplAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expectedPerNft = (elapsed * (amount / duration)) / 2n;

      const pending1 = await engine.getPendingReward(1n, aaplAddr);
      const pending3 = await engine.getPendingReward(3n, aaplAddr);

      expect(pending1).to.equal(expectedPerNft);
      expect(pending3).to.equal(expectedPerNft);
    });
  });

  describe("NFT Transfer Behavior & TokenId Accounting", function () {
    it("transfer after rewards accrue preserves reward state attached to tokenId", async function () {
      const { banana, nft, activationController, engine, mocks, alice, bob, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const aapl = mocks["AAPLx"];
      const aaplAddr = await aapl.getAddress();
      const amount = 1_000n * 10n ** 18n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await aapl.mint(funder.address, amount);
      await aapl.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(aaplAddr, amount, 100n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await networkHelpers.time.increase(30);
      await networkHelpers.mine();

      const pendingBefore = await engine.getPendingReward(1n, aaplAddr);
      expect(pendingBefore).to.be.greaterThan(0n);

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);

      const elapsed = BigInt(xferBlock.timestamp - fundBlock.timestamp);
      const expectedAccrued = elapsed * (amount / 100n);

      const accruedAfter = await engine.getAccruedReward(1n, aaplAddr);
      expect(accruedAfter).to.equal(expectedAccrued);
      expect(await engine.getTotalClaimableReward(1n, aaplAddr)).to.equal(accruedAfter);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("transfer deactivates NFT; new owner reactivates to earn post-transfer rewards", async function () {
      const { banana, nft, activationController, engine, mocks, alice, bob, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      await banana.transfer(bob.address, DEFAULT_ACTIVATION_COST);
      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(1n);

      const amount = 1_000n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, 100n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / 100n);

      const totalClaimable = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(totalClaimable).to.equal(expected);
    });

    it("repeated transfers require repeated activations and preserve pre-transfer accrued rewards", async function () {
      const { banana, nft, activationController, engine, mocks, alice, bob, charlie, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 5_000n * 10n ** 6n;

      await banana.transfer(bob.address, DEFAULT_ACTIVATION_COST);
      await banana.transfer(charlie.address, DEFAULT_ACTIVATION_COST);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, 500n);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();
      const xfer1 = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const b1 = await ethers.provider.getBlock(xfer1.blockNumber);
      const aliceEarned = BigInt(b1.timestamp - fundBlock.timestamp) * (amount / 500n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actBob = await activationController.connect(bob).activate(1n);
      const bBobAct = await ethers.provider.getBlock(actBob.blockNumber);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();
      const xfer2 = await nft.connect(bob).transferFrom(bob.address, charlie.address, 1n);
      const b2 = await ethers.provider.getBlock(xfer2.blockNumber);
      const bobEarned = BigInt(b2.timestamp - bBobAct.timestamp) * (amount / 500n);

      await banana.connect(charlie).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actCharlie = await activationController.connect(charlie).activate(1n);
      const bCharlieAct = await ethers.provider.getBlock(actCharlie.blockNumber);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const charlieEarned = BigInt(latestBlock.timestamp - bCharlieAct.timestamp) * (amount / 500n);

      const totalClaimable = await engine.getTotalClaimableReward(1n, usdgAddr);
      expect(totalClaimable).to.equal(aliceEarned + bobEarned + charlieEarned);
    });
  });

  describe("Multi-Asset & Non-18 Decimal Normalization", function () {
    it("supports multiple reward assets simultaneously (AAPLx 18 dec vs USDG 6 dec)", async function () {
      const { banana, activationController, engine, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const aapl = mocks["AAPLx"];
      const usdg = mocks["USDG"];
      const aaplAddr = await aapl.getAddress();
      const usdgAddr = await usdg.getAddress();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      const aaplAmount = 1_000n * 10n ** 18n;
      const usdgAmount = 1_000n * 10n ** 6n;

      await aapl.mint(funder.address, aaplAmount);
      await usdg.mint(funder.address, usdgAmount);

      await aapl.connect(funder).approve(await engine.getAddress(), aaplAmount);
      await usdg.connect(funder).approve(await engine.getAddress(), usdgAmount);

      const fundTxAAPL = await engine.connect(funder).fundReward(aaplAddr, aaplAmount, 100n);
      const fundTxUSDG = await engine.connect(funder).fundReward(usdgAddr, usdgAmount, 100n);
      const fundBlockAAPL = await ethers.provider.getBlock(fundTxAAPL.blockNumber);
      const fundBlockUSDG = await ethers.provider.getBlock(fundTxUSDG.blockNumber);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsedAAPL = BigInt(latestBlock.timestamp - fundBlockAAPL.timestamp);
      const elapsedUSDG = BigInt(latestBlock.timestamp - fundBlockUSDG.timestamp);

      const expectedAAPL = elapsedAAPL * (aaplAmount / 100n);
      const expectedUSDG = elapsedUSDG * (usdgAmount / 100n);

      const pendingAAPL = await engine.getPendingReward(1n, aaplAddr);
      const pendingUSDG = await engine.getPendingReward(1n, usdgAddr);

      expect(pendingAAPL).to.equal(expectedAAPL);
      expect(pendingUSDG).to.equal(expectedUSDG);
    });
  });

  describe("Precision, Rounding & Expiry Boundaries", function () {
    it("reward rate drops to zero after periodFinish (no post-expiry inflation)", async function () {
      const { banana, activationController, engine, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await networkHelpers.time.increase(150);
      await networkHelpers.mine();

      const pending = await engine.getPendingReward(1n, usdgAddr);
      expect(pending).to.equal(amount);
    });

    it("multiple funding events correctly extend and update emission rates", async function () {
      const { banana, activationController, engine, mocks, alice, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const aapl = mocks["AAPLx"];
      const aaplAddr = await aapl.getAddress();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n);

      await aapl.mint(funder.address, 1_000n * 10n ** 18n);
      await aapl.connect(funder).approve(await engine.getAddress(), 1_000n * 10n ** 18n);
      await engine.connect(funder).fundReward(aaplAddr, 500n * 10n ** 18n, 50n);
      await engine.updateRewardForAsset(1n, aaplAddr);

      await networkHelpers.time.increase(25);
      await networkHelpers.mine();

      await engine.connect(funder).fundReward(aaplAddr, 500n * 10n ** 18n, 50n);

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const totalClaimable = await engine.getTotalClaimableReward(1n, aaplAddr);
      expect(totalClaimable).to.equal(1_000n * 10n ** 18n);
    });
  });

  describe("Security & Constraints", function () {
    it("no reward creation without funding (total claimable <= total funded)", async function () {
      const { engine, mocks } = await loadFixture(deployEngineFixture);
      const usdgAddr = await mocks["USDG"].getAddress();
      const info = await engine.rewardAssets(usdgAddr);
      expect(info.totalFunded).to.equal(0n);
      expect(await engine.getPendingReward(1n, usdgAddr)).to.equal(0n);
    });

    it("only NFT contract can call onNftTransfer", async function () {
      const { engine, attacker } = await loadFixture(deployEngineFixture);
      await expect(
        engine.connect(attacker).onNftTransfer(attacker.address, attacker.address, 1n)
      ).to.be.revertedWithCustomError(engine, "OnlyNFTContractAllowed");
    });

    it("pause halts updateReward and fundReward", async function () {
      const { engine, mocks, funder } = await loadFixture(deployEngineFixture);
      const usdgAddr = await mocks["USDG"].getAddress();

      await engine.pause();

      await expect(
        engine.connect(funder).fundReward(usdgAddr, 100n, 100n)
      ).to.be.revertedWithCustomError(engine, "EnforcedPause");

      await expect(
        engine.updateReward(1n)
      ).to.be.revertedWithCustomError(engine, "EnforcedPause");
    });

    it("unpause resumes updateReward and fundReward", async function () {
      const { engine, mocks, funder, ethers } = await loadFixture(deployEngineFixture);
      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();

      await engine.pause();
      await engine.unpause();

      const amount = 100n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);

      await expect(
        engine.connect(funder).fundReward(usdgAddr, amount, 100n)
      ).to.not.be.revert(ethers);
    });
  });

  describe("Part J — Activation Checkpoint Invariance & Regression Tests", function () {
    it("1. Mathematical Regression Test: Claiming one NFT does not reset an untouched NFT's accrued rewards", async function () {
      const { banana, activationController, engine, nft, mocks, alice, bob, funder, networkHelpers, ethers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 3_600n * 10n ** 6n;
      const duration = 3600n;

      await nft.mint(alice.address);
      await nft.mint(bob.address);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(4n);

      await networkHelpers.time.increase(10);
      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actTx5 = await activationController.connect(bob).activate(5n);
      const actBlock5 = await ethers.provider.getBlock(actTx5.blockNumber);
      const tAct5 = actBlock5.timestamp;

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      await engine.updateReward(4n);

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const t3 = latestBlock.timestamp;

      const elapsed5 = BigInt(t3 - tAct5);
      const expectedToken5Reward = elapsed5 * 500_000n;

      const actualPending5 = await engine.getPendingReward(5n, usdgAddr);
      const actualTotal5 = await engine.getTotalClaimableReward(5n, usdgAddr);

      expect(actualPending5).to.equal(expectedToken5Reward);
      expect(actualTotal5).to.equal(expectedToken5Reward);
    });

    it("2. Exact Multi-NFT Bug Reproduction: Untouched tokens #5 and #6 retain full rewards when #4 claims", async function () {
      const { banana, activationController, engine, nft, mocks, alice, bob, charlie, funder, networkHelpers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 3_600n * 10n ** 6n;
      const duration = 3600n;

      await nft.mint(alice.address);
      await nft.mint(bob.address);
      await nft.mint(charlie.address);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(4n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(5n);

      await banana.connect(charlie).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(charlie).activate(6n);

      await networkHelpers.time.increase(200);
      await networkHelpers.mine();

      const expectedBeforeClaim5 = await engine.getTotalClaimableReward(5n, usdgAddr);
      const expectedBeforeClaim6 = await engine.getTotalClaimableReward(6n, usdgAddr);
      expect(expectedBeforeClaim5).to.be.gt(0n);
      expect(expectedBeforeClaim6).to.be.gt(0n);

      await engine.updateReward(4n);

      const actualAfter5 = await engine.getTotalClaimableReward(5n, usdgAddr);
      const actualAfter6 = await engine.getTotalClaimableReward(6n, usdgAddr);

      expect(actualAfter5).to.be.gte(expectedBeforeClaim5);
      expect(actualAfter6).to.be.gte(expectedBeforeClaim6);
    });

    it("3. Order-Independence: Claim order across isolated fixtures yields identical payouts", async function () {
      async function runScenario(firstToken, secondToken) {
        const { banana, activationController, engine, nft, mocks, alice, bob, funder, networkHelpers } =
          await loadFixture(deployEngineFixture);

        const usdg = mocks["USDG"];
        const usdgAddr = await usdg.getAddress();
        const amount = 3_600n * 10n ** 6n;
        const duration = 3600n;

        await nft.mint(alice.address);
        await nft.mint(bob.address);

        await usdg.mint(funder.address, amount);
        await usdg.connect(funder).approve(await engine.getAddress(), amount);
        await engine.connect(funder).fundReward(usdgAddr, amount, duration);

        await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
        await activationController.connect(alice).activate(4n);

        await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
        await activationController.connect(bob).activate(5n);

        await networkHelpers.time.increase(1800);
        await networkHelpers.mine();

        await engine.updateReward(firstToken);
        await engine.updateReward(secondToken);

        const reward4 = await engine.getTotalClaimableReward(4n, usdgAddr);
        const reward5 = await engine.getTotalClaimableReward(5n, usdgAddr);

        return { reward4, reward5 };
      }

      const resA = await runScenario(4n, 5n);
      const resB = await runScenario(5n, 4n);

      expect(resA.reward4).to.be.closeTo(resB.reward4, 1_000_000n);
      expect(resA.reward5).to.be.closeTo(resB.reward5, 1_000_000n);
    });

    it("4. Activation Delay: NFT activated mid-period receives zero retroactive rewards", async function () {
      const { banana, activationController, engine, nft, mocks, alice, funder, networkHelpers, ethers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 3_600n * 10n ** 6n;
      const duration = 3600n;

      await nft.mint(alice.address);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await networkHelpers.time.increase(1000);
      await networkHelpers.mine();

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actTx = await activationController.connect(alice).activate(4n);
      const actBlock = await ethers.provider.getBlock(actTx.blockNumber);
      const t1 = actBlock.timestamp;

      await networkHelpers.time.increase(500);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const t2 = latestBlock.timestamp;
      const elapsedActive = BigInt(t2 - t1);

      const expected = elapsedActive * 1_000_000n;
      const actual = await engine.getTotalClaimableReward(4n, usdgAddr);

      expect(actual).to.equal(expected);
    });

    it("5. Repeated Claims Resilience: Untouched NFT accrues continuously across multiple claims on other NFTs", async function () {
      const { banana, activationController, engine, nft, mocks, alice, bob, funder, networkHelpers, ethers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 10_000n * 10n ** 6n;
      const duration = 10_000n;

      await nft.mint(alice.address);
      await nft.mint(bob.address);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(4n);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const actTx5 = await activationController.connect(bob).activate(5n);
      const actBlock5 = await ethers.provider.getBlock(actTx5.blockNumber);
      const tAct5 = actBlock5.timestamp;

      for (let i = 0; i < 3; i++) {
        await networkHelpers.time.increase(100);
        await engine.updateReward(4n);
      }

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed5 = BigInt(latestBlock.timestamp - tAct5);
      const expected5 = elapsed5 * 500_000n;

      const actual5 = await engine.getTotalClaimableReward(5n, usdgAddr);
      expect(actual5).to.equal(expected5);
    });

    it("6. Transfer and Reactivation: Resets activation, preserves old accrued rewards, and establishes fresh baseline", async function () {
      const { banana, activationController, engine, nft, mocks, alice, bob, funder, networkHelpers, ethers } =
        await loadFixture(deployEngineFixture);

      const usdg = mocks["USDG"];
      const usdgAddr = await usdg.getAddress();
      const amount = 10_000n * 10n ** 6n;
      const duration = 10_000n;

      await nft.mint(alice.address);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, duration);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(4n);

      await networkHelpers.time.increase(200);
      await networkHelpers.mine();

      await nft.connect(alice).transferFrom(alice.address, bob.address, 4n);

      expect(await activationController.isActivated(4n)).to.be.false;

      const preTransferAccrued = await engine.getAccruedReward(4n, usdgAddr);
      expect(preTransferAccrued).to.be.gt(0n);

      await networkHelpers.time.increase(500);
      await networkHelpers.mine();

      const midReward = await engine.getTotalClaimableReward(4n, usdgAddr);
      expect(midReward).to.equal(preTransferAccrued);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      const reactTx = await activationController.connect(bob).activate(4n);
      const reactBlock = await ethers.provider.getBlock(reactTx.blockNumber);
      const tReact = reactBlock.timestamp;

      await networkHelpers.time.increase(300);
      await networkHelpers.mine();

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsedPostReact = BigInt(latestBlock.timestamp - tReact);
      const postReactReward = elapsedPostReact * 1_000_000n;

      const finalTotal = await engine.getTotalClaimableReward(4n, usdgAddr);
      expect(finalTotal).to.equal(preTransferAccrued + postReactReward);
    });
  });
});
