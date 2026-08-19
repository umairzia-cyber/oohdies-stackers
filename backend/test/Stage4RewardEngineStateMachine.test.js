import { expect } from "chai";
import hre from "hardhat";

describe("Stage 4: Reward Engine State Machine & Reference Model", function () {
  const PRECISION_FACTOR = 10n ** 36n;
  const BASE_WEIGHT = 10000n;
  const ACTIVATION_COST = 100n * 10n ** 18n;

  let connection;
  let ethers;
  let networkHelpers;

  let owner, alice, bob, charlie, attacker;
  let banana, nft, controller, engine, vault, registry, accountImpl;
  let rewardTokens = [];
  let rewardTokenMap = {};

  const ASSET_SYMBOLS = [
    "USDG", "AAPLx", "TSLAx", "NVDAx",
    "MSFTx", "AMZNx", "GOOGLx", "METAx",
    "PLTRx", "AMDx", "GMEx", "SPCXx"
  ];

  // Reference Model Class
  class RewardEngineReferenceModel {
    constructor() {
      this.assets = {};
      this.nfts = {};
      this.activeWeightForAsset = {};
      this.activeCountForAsset = {};
      this.currentTime = 0n;
    }

    registerAsset(symbol, address, decimals) {
      this.assets[address] = {
        symbol,
        address,
        decimals,
        rewardRate: 0n,
        lastUpdateTime: 0n,
        globalRewardIndex: 0n,
        periodFinish: 0n,
        totalFunded: 0n,
      };
      this.activeWeightForAsset[address] = 0n;
      this.activeCountForAsset[address] = 0n;
    }

    setTime(t) {
      this.currentTime = BigInt(t);
    }

    lastTimeRewardApplicable(asset) {
      const a = this.assets[asset];
      return this.currentTime < a.periodFinish ? this.currentTime : a.periodFinish;
    }

    rewardPerToken(asset) {
      const a = this.assets[asset];
      const totalWeight = this.activeWeightForAsset[asset];
      if (totalWeight === 0n) return a.globalRewardIndex;

      const lastApplicable = this.lastTimeRewardApplicable(asset);
      if (lastApplicable <= a.lastUpdateTime) return a.globalRewardIndex;

      const timeDelta = lastApplicable - a.lastUpdateTime;
      const rewardEmitted = timeDelta * a.rewardRate;
      const indexDelta = (rewardEmitted * PRECISION_FACTOR) / totalWeight;
      return a.globalRewardIndex + indexDelta;
    }

    updateGlobalIndex(asset) {
      const a = this.assets[asset];
      a.globalRewardIndex = this.rewardPerToken(asset);
      a.lastUpdateTime = this.lastTimeRewardApplicable(asset);
    }

    fundReward(asset, amount, duration) {
      const a = this.assets[asset];
      this.updateGlobalIndex(asset);

      amount = BigInt(amount);
      duration = BigInt(duration);

      if (this.currentTime >= a.periodFinish) {
        a.rewardRate = amount / duration;
      } else {
        const remainingTime = a.periodFinish - this.currentTime;
        const leftover = remainingTime * a.rewardRate;
        a.rewardRate = (amount + leftover) / duration;
      }

      a.lastUpdateTime = this.currentTime;
      a.periodFinish = this.currentTime + duration;
      a.totalFunded += amount;
    }

    activateNFT(tokenId, picks, weight = BASE_WEIGHT) {
      tokenId = tokenId.toString();
      if (!this.nfts[tokenId]) {
        this.nfts[tokenId] = {
          picks: [],
          userIndex: {},
          accruedRewards: {},
          isInitialized: {},
          weight: 0n,
          isActivated: false,
        };
      }
      const nft = this.nfts[tokenId];
      if (nft.isActivated) {
        this.deactivateNFT(tokenId);
      }

      nft.weight = BigInt(weight);
      nft.isActivated = true;
      nft.picks = [...picks];

      for (const asset of picks) {
        this.updateGlobalIndex(asset);
        this.activeCountForAsset[asset] += 1n;
        this.activeWeightForAsset[asset] += nft.weight;
        nft.userIndex[asset] = this.assets[asset].globalRewardIndex;
        nft.isInitialized[asset] = true;
        if (!nft.accruedRewards[asset]) nft.accruedRewards[asset] = 0n;
      }
    }

    deactivateNFT(tokenId) {
      tokenId = tokenId.toString();
      const nft = this.nfts[tokenId];
      if (!nft || !nft.isActivated) return;

      for (const asset of nft.picks) {
        this.updateGlobalIndex(asset);
        const currIndex = this.assets[asset].globalRewardIndex;
        const uIndex = nft.userIndex[asset] || 0n;
        if (currIndex > uIndex) {
          const indexDelta = currIndex - uIndex;
          const pending = (indexDelta * nft.weight) / PRECISION_FACTOR;
          nft.accruedRewards[asset] = (nft.accruedRewards[asset] || 0n) + pending;
        }
        nft.userIndex[asset] = currIndex;
        this.activeCountForAsset[asset] -= 1n;
        this.activeWeightForAsset[asset] -= nft.weight;
        nft.isInitialized[asset] = false;
      }
      nft.picks = [];
      nft.weight = 0n;
      nft.isActivated = false;
    }

    getPendingReward(tokenId, asset) {
      tokenId = tokenId.toString();
      const nft = this.nfts[tokenId];
      if (!nft || !nft.isActivated || !nft.picks.includes(asset)) return 0n;

      const currIndex = this.rewardPerToken(asset);
      const uIndex = nft.userIndex[asset] || 0n;
      if (currIndex <= uIndex) return 0n;

      const indexDelta = currIndex - uIndex;
      return (indexDelta * nft.weight) / PRECISION_FACTOR;
    }

    getTotalClaimable(tokenId, asset) {
      tokenId = tokenId.toString();
      const nft = this.nfts[tokenId];
      if (!nft) return 0n;
      const accrued = nft.accruedRewards[asset] || 0n;
      const pending = this.getPendingReward(tokenId, asset);
      return accrued + pending;
    }

    claimReward(tokenId, asset) {
      tokenId = tokenId.toString();
      const claimable = this.getTotalClaimable(tokenId, asset);
      const nft = this.nfts[tokenId];
      if (nft) {
        this.updateGlobalIndex(asset);
        nft.accruedRewards[asset] = 0n;
        if (nft.isActivated && nft.picks.includes(asset)) {
          nft.userIndex[asset] = this.assets[asset].globalRewardIndex;
        }
      }
      return claimable;
    }
  }

  let refModel;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  beforeEach(async function () {
    [owner, alice, bob, charlie, attacker] = await ethers.getSigners();

    // Deploy BananaToken
    const BananaFactory = await ethers.getContractFactory("BananaToken");
    banana = await BananaFactory.deploy(owner.address);
    await banana.waitForDeployment();

    // Deploy OohdiesNFT
    const NFTFactory = await ethers.getContractFactory("OohdiesNFT");
    nft = await NFTFactory.deploy(owner.address);
    await nft.waitForDeployment();

    // Deploy ActivationController with 100 BANANA cost
    const ControllerFactory = await ethers.getContractFactory("ActivationController");
    controller = await ControllerFactory.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      owner.address,
      ACTIVATION_COST
    );
    await controller.waitForDeployment();

    // Deploy EarningEngine
    const EngineFactory = await ethers.getContractFactory("EarningEngine");
    engine = await EngineFactory.deploy(
      await controller.getAddress(),
      await nft.getAddress(),
      owner.address
    );
    await engine.waitForDeployment();

    // Deploy RewardVault & ERC6551
    const RegistryFactory = await ethers.getContractFactory("ERC6551Registry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();

    const AccountFactory = await ethers.getContractFactory("OohdiesAccount");
    accountImpl = await AccountFactory.deploy();
    await accountImpl.waitForDeployment();

    const VaultFactory = await ethers.getContractFactory("RewardVault");
    vault = await VaultFactory.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      owner.address,
      await registry.getAddress(),
      await accountImpl.getAddress(),
      ethers.ZeroHash
    );
    await vault.waitForDeployment();

    // Wire contracts
    await engine.setRewardVault(await vault.getAddress());
    await controller.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await controller.getAddress());
    await nft.setEarningEngine(await engine.getAddress());

    // Deploy 12 reward tokens & register in Engine
    rewardTokens = [];
    rewardTokenMap = {};
    refModel = new RewardEngineReferenceModel();

    for (let i = 0; i < ASSET_SYMBOLS.length; i++) {
      const sym = ASSET_SYMBOLS[i];
      const decimals = sym === "USDG" ? 6 : 18;
      const TokenFactory = await ethers.getContractFactory("MockRewardToken");
      const tok = await TokenFactory.deploy(sym, sym, decimals, owner.address);
      await tok.waitForDeployment();
      const addr = await tok.getAddress();
      rewardTokens.push(tok);
      rewardTokenMap[sym] = tok;

      await engine.registerRewardAsset(addr);
      refModel.registerAsset(sym, addr, decimals);
    }

    // Set engine funder
    await engine.setFunder(owner.address, true);

    // Distribute BANANA
    await banana.transfer(alice.address, 5000n * 10n ** 18n);
    await banana.transfer(bob.address, 5000n * 10n ** 18n);
    await banana.transfer(charlie.address, 5000n * 10n ** 18n);
    await banana.transfer(attacker.address, 5000n * 10n ** 18n);

    await banana.connect(alice).approve(await controller.getAddress(), ethers.MaxUint256);
    await banana.connect(bob).approve(await controller.getAddress(), ethers.MaxUint256);
    await banana.connect(charlie).approve(await controller.getAddress(), ethers.MaxUint256);
    await banana.connect(attacker).approve(await controller.getAddress(), ethers.MaxUint256);
  });

  it("Scenario 1: Fresh activation with valid disjoint 3-asset selections", async function () {
    await nft.mint(alice.address);
    await nft.mint(bob.address);

    const picksAlice = [await rewardTokens[0].getAddress(), await rewardTokens[1].getAddress(), await rewardTokens[2].getAddress()]; // USDG, AAPLx, TSLAx
    const picksBob = [await rewardTokens[3].getAddress(), await rewardTokens[4].getAddress(), await rewardTokens[5].getAddress()]; // NVDAx, MSFTx, AMZNx

    await controller.connect(alice).activate(1, picksAlice);
    await controller.connect(bob).activate(2, picksBob);

    const now = BigInt(await networkHelpers.time.latest());
    refModel.setTime(now);
    refModel.activateNFT(1, picksAlice);
    refModel.activateNFT(2, picksBob);

    // Verify chosen assets on-chain match reference model
    const chosenA = await engine.getChosenAssets(1);
    const chosenB = await engine.getChosenAssets(2);
    expect(chosenA).to.deep.equal(picksAlice);
    expect(chosenB).to.deep.equal(picksBob);

    // Verify active counts
    for (let i = 0; i < 3; i++) {
      expect(await engine.activeCountForAsset(picksAlice[i])).to.equal(1n);
      expect(await engine.activeCountForAsset(picksBob[i])).to.equal(1n);
    }
    // Unchosen assets have 0 count
    for (let i = 6; i < 12; i++) {
      expect(await engine.activeCountForAsset(await rewardTokens[i].getAddress())).to.equal(0n);
    }
  });

  it("Scenario 2 & 6: Fresh activation with overlapping selections & claim order independence", async function () {
    await nft.mint(alice.address);
    await nft.mint(bob.address);

    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();
    const msft = await rewardTokenMap["MSFTx"].getAddress();

    const picksAlice = [aapl, tsla, nvda];
    const picksBob = [aapl, msft, nvda]; // Overlaps on AAPL and NVDA

    await controller.connect(alice).activate(1, picksAlice);
    await controller.connect(bob).activate(2, picksBob);

    let now = BigInt(await networkHelpers.time.latest());
    refModel.setTime(now);
    refModel.activateNFT(1, picksAlice);
    refModel.activateNFT(2, picksBob);

    expect(await engine.activeCountForAsset(aapl)).to.equal(2n);
    expect(await engine.activeCountForAsset(nvda)).to.equal(2n);
    expect(await engine.activeCountForAsset(tsla)).to.equal(1n);
    expect(await engine.activeCountForAsset(msft)).to.equal(1n);

    // Fund AAPL with 100 tokens over 100s, deposit 100 tokens in Vault
    await rewardTokenMap["AAPLx"].mint(owner.address, 200n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), 100n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), 100n * 10n ** 18n);
    await vault.depositReward(aapl, 100n * 10n ** 18n);
    await engine.fundReward(aapl, 100n * 10n ** 18n, 100);

    now = BigInt(await networkHelpers.time.latest());
    refModel.setTime(now);
    refModel.fundReward(aapl, 100n * 10n ** 18n, 100n);

    await networkHelpers.time.increase(20);
    now = BigInt(await networkHelpers.time.latest());
    refModel.setTime(now);

    const claimableAlice = await engine.getTotalClaimableReward(1, aapl);
    const claimableBob = await engine.getTotalClaimableReward(2, aapl);

    const refAlice = refModel.getTotalClaimable(1, aapl);
    const refBob = refModel.getTotalClaimable(2, aapl);

    expect(claimableAlice).to.be.closeTo(refAlice, 10n ** 15n);
    expect(claimableBob).to.be.closeTo(refBob, 10n ** 15n);
    expect(claimableAlice).to.equal(claimableBob); // Equal split (1/2 each)

    // Bob claims FIRST (Reversed order check)
    await vault.connect(bob).claimReward(2, aapl);
    refModel.claimReward(2, aapl);

    // Alice's claimable after Bob's claim
    const aliceClaimableAfterBob = await engine.getTotalClaimableReward(1, aapl);
    expect(aliceClaimableAfterBob).to.be.gte(claimableAlice);

    // Alice claims SECOND
    await vault.connect(alice).claimReward(1, aapl);
    refModel.claimReward(1, aapl);

    const tbaAlice = await vault.accountOf(1);
    const tbaBob = await vault.accountOf(2);

    expect(await rewardTokenMap["AAPLx"].balanceOf(tbaAlice)).to.be.gt(0);
    expect(await rewardTokenMap["AAPLx"].balanceOf(tbaBob)).to.be.gt(0);
  });

  it("Scenario 7 & 8: Transfer active NFT (deactivation) and reactivation with different picks", async function () {
    await nft.mint(alice.address);
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();
    const msft = await rewardTokenMap["MSFTx"].getAddress();
    const amzn = await rewardTokenMap["AMZNx"].getAddress();
    const goog = await rewardTokenMap["GOOGLx"].getAddress();

    const picks1 = [aapl, tsla, nvda];
    await controller.connect(alice).activate(1, picks1);

    // Fund AAPLx (200 tokens: 100 for vault, 100 for engine)
    await rewardTokenMap["AAPLx"].mint(owner.address, 200n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), 100n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), 100n * 10n ** 18n);
    await vault.depositReward(aapl, 100n * 10n ** 18n);
    await engine.fundReward(aapl, 100n * 10n ** 18n, 100);

    await networkHelpers.time.increase(10);

    const accruedBeforeTransfer = await engine.getTotalClaimableReward(1, aapl);
    expect(accruedBeforeTransfer).to.be.gt(0);

    // Transfer Alice -> Bob
    await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    const accruedAtTransfer = await engine.getTotalClaimableReward(1, aapl);
    expect(accruedAtTransfer).to.be.gt(0);

    // Deactivation on transfer verified:
    expect(await controller.isActivated(1)).to.equal(false);
    expect(await engine.getChosenAssets(1)).to.deep.equal([]);
    expect(await engine.activeCountForAsset(aapl)).to.equal(0n);

    // Accrual cessation check
    await networkHelpers.time.increase(10);
    const accruedAfterWait = await engine.getTotalClaimableReward(1, aapl);
    expect(accruedAfterWait).to.equal(accruedAtTransfer); // Accrued exactly 0 during inactive period

    // Bob Reactivates with different picks: [MSFTx, AMZNx, GOOGLx]
    const picks2 = [msft, amzn, goog];
    await controller.connect(bob).activate(1, picks2);

    expect(await controller.isActivated(1)).to.equal(true);
    expect(await engine.getChosenAssets(1)).to.deep.equal(picks2);

    // Old AAPLx accrual is 100% PRESERVED
    expect(await engine.getTotalClaimableReward(1, aapl)).to.equal(accruedAtTransfer);

    // Claim old AAPLx into TBA
    await vault.connect(bob).claimReward(1, aapl);
    const tba = await vault.accountOf(1);
    expect(await rewardTokenMap["AAPLx"].balanceOf(tba)).to.equal(accruedAtTransfer);
  });

  it("Scenario 9: Zero-picker asset funded before later activation (no retroactive rewards)", async function () {
    const amd = await rewardTokenMap["AMDx"].getAddress();
    const gme = await rewardTokenMap["GMEx"].getAddress();
    const spcx = await rewardTokenMap["SPCXx"].getAddress();

    // Fund AMDx with 0 active pickers
    await rewardTokenMap["AMDx"].mint(owner.address, 100n * 10n ** 18n);
    await rewardTokenMap["AMDx"].approve(await engine.getAddress(), 100n * 10n ** 18n);
    await engine.fundReward(amd, 100n * 10n ** 18n, 100);

    expect(await engine.activeCountForAsset(amd)).to.equal(0n);

    // Advance 50 seconds (half emission elapsed with 0 pickers)
    await networkHelpers.time.increase(50);

    // Now Alice activates NFT 1 with AMDx
    await nft.mint(alice.address);
    await controller.connect(alice).activate(1, [amd, gme, spcx]);

    // Right at activation, claimable AMDx must be exactly 0 (no retroactive reward)
    expect(await engine.getTotalClaimableReward(1, amd)).to.equal(0n);

    // Advance 10 seconds post-activation
    await networkHelpers.time.increase(10);

    // It earns ONLY for the 10 seconds post-activation
    const claimable = await engine.getTotalClaimableReward(1, amd);
    expect(claimable).to.be.closeTo(10n * 10n ** 18n, 10n ** 17n);
  });

  it("Scenario 13: Underfunded RewardVault behavior & atomic rollback", async function () {
    await nft.mint(alice.address);
    const spcx = await rewardTokenMap["SPCXx"].getAddress();
    const gme = await rewardTokenMap["GMEx"].getAddress();
    const amd = await rewardTokenMap["AMDx"].getAddress();

    await controller.connect(alice).activate(1, [spcx, gme, amd]);

    // Fund EarningEngine with 100 SPCXx (do NOT deposit into RewardVault)
    await rewardTokenMap["SPCXx"].mint(owner.address, 100n * 10n ** 18n);
    await rewardTokenMap["SPCXx"].approve(await engine.getAddress(), 100n * 10n ** 18n);
    await engine.fundReward(spcx, 100n * 10n ** 18n, 10);

    await networkHelpers.time.increase(12);

    const claimable = await engine.getTotalClaimableReward(1, spcx);
    expect(claimable).to.be.gt(0);

    // Vault has 0 SPCXx balance
    expect(await rewardTokenMap["SPCXx"].balanceOf(await vault.getAddress())).to.equal(0n);

    // Claim should revert with custom error InsufficientVaultBalance
    await expect(vault.connect(alice).claimReward(1, spcx)).to.be.revertedWithCustomError(
      vault,
      "InsufficientVaultBalance"
    );

    // Verify atomic rollback: claimable amount is not lost
    const claimablePost = await engine.getTotalClaimableReward(1, spcx);
    expect(claimablePost).to.equal(claimable);
  });

  it("Scenario 14: 6-decimal (USDG) and 18-decimal (AAPLx) asset precision math", async function () {
    await nft.mint(alice.address);
    const usdg = await rewardTokenMap["USDG"].getAddress();
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();

    await controller.connect(alice).activate(1, [usdg, aapl, tsla]);

    // Fund USDG (6 decimals) with 100 USDG (100 * 10^6) over 100s
    const usdgAmount = 100n * 10n ** 6n;
    await rewardTokenMap["USDG"].mint(owner.address, usdgAmount * 2n);
    await rewardTokenMap["USDG"].approve(await engine.getAddress(), usdgAmount);
    await rewardTokenMap["USDG"].approve(await vault.getAddress(), usdgAmount);
    await vault.depositReward(usdg, usdgAmount);
    await engine.fundReward(usdg, usdgAmount, 100);

    // Fund AAPLx (18 decimals) with 100 AAPLx (100 * 10^18) over 100s
    const aaplAmount = 100n * 10n ** 18n;
    await rewardTokenMap["AAPLx"].mint(owner.address, aaplAmount * 2n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), aaplAmount);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), aaplAmount);
    await vault.depositReward(aapl, aaplAmount);
    await engine.fundReward(aapl, aaplAmount, 100);

    await networkHelpers.time.increase(50);

    const usdgClaimable = await engine.getTotalClaimableReward(1, usdg);
    const aaplClaimable = await engine.getTotalClaimableReward(1, aapl);

    expect(usdgClaimable).to.be.closeTo(50n * 10n ** 6n, 10n * 10n ** 6n);
    expect(aaplClaimable).to.be.closeTo(50n * 10n ** 18n, 5n * 10n ** 18n);

    // Claim both
    await vault.connect(alice).claimReward(1, usdg);
    await vault.connect(alice).claimReward(1, aapl);

    const tba = await vault.accountOf(1);
    expect(await rewardTokenMap["USDG"].balanceOf(tba)).to.be.closeTo(50n * 10n ** 6n, 10n * 10n ** 6n);
    expect(await rewardTokenMap["AAPLx"].balanceOf(tba)).to.be.closeTo(50n * 10n ** 18n, 5n * 10n ** 18n);
  });

  it("Scenario 3 & 4: Activation immediately before/after global index update & baseline preservation", async function () {
    await nft.mint(alice.address);
    await nft.mint(bob.address);
    await nft.mint(charlie.address);

    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();

    // Alice activates Token 1 with AAPLx
    await controller.connect(alice).activate(1, [aapl, tsla, nvda]);

    // Fund AAPLx (100 tokens, 100s)
    await rewardTokenMap["AAPLx"].mint(owner.address, 200n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), 100n * 10n ** 18n);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), 100n * 10n ** 18n);
    await vault.depositReward(aapl, 100n * 10n ** 18n);
    await engine.fundReward(aapl, 100n * 10n ** 18n, 100);

    await networkHelpers.time.increase(20);

    // Bob activates Token 2 BEFORE Alice's claim/index update
    await controller.connect(bob).activate(2, [aapl, tsla, nvda]);
    expect(await engine.getTotalClaimableReward(2, aapl)).to.equal(0n); // 0 at activation

    // Alice claims (triggers global index update)
    await vault.connect(alice).claimReward(1, aapl);

    // Charlie activates Token 3 AFTER Alice's claim/index update
    await controller.connect(charlie).activate(3, [aapl, tsla, nvda]);
    expect(await engine.getTotalClaimableReward(3, aapl)).to.equal(0n); // 0 at activation

    // Advance 10s
    await networkHelpers.time.increase(10);

    // Token 2 (Bob) and Token 3 (Charlie) accrue without retroactive rewards
    const bobClaimable = await engine.getTotalClaimableReward(2, aapl);
    const charlieClaimable = await engine.getTotalClaimableReward(3, aapl);

    expect(bobClaimable).to.be.gt(0);
    expect(charlieClaimable).to.be.gt(0);
    expect(bobClaimable).to.be.gte(charlieClaimable);
  });

  it("Scenario 5: Multiple claims of different assets for the same NFT (cross-asset isolation)", async function () {
    await nft.mint(alice.address);
    const usdg = await rewardTokenMap["USDG"].getAddress();
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();

    await controller.connect(alice).activate(1, [usdg, aapl, tsla]);

    // Fund USDG and AAPLx
    const usdgAmount = 100n * 10n ** 6n;
    await rewardTokenMap["USDG"].mint(owner.address, usdgAmount * 2n);
    await rewardTokenMap["USDG"].approve(await engine.getAddress(), usdgAmount);
    await rewardTokenMap["USDG"].approve(await vault.getAddress(), usdgAmount);
    await vault.depositReward(usdg, usdgAmount);
    await engine.fundReward(usdg, usdgAmount, 100);

    const aaplAmount = 100n * 10n ** 18n;
    await rewardTokenMap["AAPLx"].mint(owner.address, aaplAmount * 2n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), aaplAmount);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), aaplAmount);
    await vault.depositReward(aapl, aaplAmount);
    await engine.fundReward(aapl, aaplAmount, 100);

    await networkHelpers.time.increase(20);

    const aaplBefore = await engine.getTotalClaimableReward(1, aapl);
    const usdgBefore = await engine.getTotalClaimableReward(1, usdg);

    // Claim USDG only
    await vault.connect(alice).claimReward(1, usdg);

    // AAPLx is untouched
    const aaplAfter = await engine.getTotalClaimableReward(1, aapl);
    expect(aaplAfter).to.be.gte(aaplBefore);

    // Claim AAPLx second
    await vault.connect(alice).claimReward(1, aapl);

    const tba = await vault.accountOf(1);
    expect(await rewardTokenMap["USDG"].balanceOf(tba)).to.be.gte(usdgBefore);
    expect(await rewardTokenMap["AAPLx"].balanceOf(tba)).to.be.gte(aaplBefore);
  });

  it("Scenario 10: Reward period expiry & cessation of accrual", async function () {
    await nft.mint(alice.address);
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();

    await controller.connect(alice).activate(1, [aapl, tsla, nvda]);

    // Fund AAPLx with 100 tokens over 50s duration
    const aaplAmount = 100n * 10n ** 18n;
    await rewardTokenMap["AAPLx"].mint(owner.address, aaplAmount * 2n);
    await rewardTokenMap["AAPLx"].approve(await engine.getAddress(), aaplAmount);
    await rewardTokenMap["AAPLx"].approve(await vault.getAddress(), aaplAmount);
    await vault.depositReward(aapl, aaplAmount);
    await engine.fundReward(aapl, aaplAmount, 50);

    // Advance 60s (past 50s periodFinish)
    await networkHelpers.time.increase(60);

    const claimableAtExpiry = await engine.getTotalClaimableReward(1, aapl);
    expect(claimableAtExpiry).to.equal(aaplAmount); // Exactly 100% of funded emission

    // Advance another 100s
    await networkHelpers.time.increase(100);

    const claimableLater = await engine.getTotalClaimableReward(1, aapl);
    expect(claimableLater).to.equal(claimableAtExpiry); // 0 additional accrual past periodFinish
  });

  it("Scenario 11 & 12: Repeated & invalid claims", async function () {
    await nft.mint(alice.address);
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();
    const msft = await rewardTokenMap["MSFTx"].getAddress(); // Unselected asset

    await controller.connect(alice).activate(1, [aapl, tsla, nvda]);

    // Attempting to claim when claimable == 0 reverts with NoRewardToClaim
    await expect(vault.connect(alice).claimReward(1, aapl)).to.be.revertedWithCustomError(
      vault,
      "NoRewardToClaim"
    );

    // Attempting to claim unselected asset (MSFTx) reverts with NoRewardToClaim
    await expect(vault.connect(alice).claimReward(1, msft)).to.be.revertedWithCustomError(
      vault,
      "NoRewardToClaim"
    );
  });

  it("Scenario 15: Invalid activation selections & protection of BANANA", async function () {
    await nft.mint(alice.address);
    const aapl = await rewardTokenMap["AAPLx"].getAddress();
    const tsla = await rewardTokenMap["TSLAx"].getAddress();
    const nvda = await rewardTokenMap["NVDAx"].getAddress();
    const msft = await rewardTokenMap["MSFTx"].getAddress();

    const bananaBefore = await banana.balanceOf(alice.address);

    // 0 assets
    await expect(controller.connect(alice).activate(1, [])).to.be.revertedWithCustomError(
      controller,
      "WrongNumberOfPicks"
    );

    // 1 asset
    await expect(controller.connect(alice).activate(1, [aapl])).to.be.revertedWithCustomError(
      controller,
      "WrongNumberOfPicks"
    );

    // 2 assets
    await expect(controller.connect(alice).activate(1, [aapl, tsla])).to.be.revertedWithCustomError(
      controller,
      "WrongNumberOfPicks"
    );

    // 4 assets
    await expect(controller.connect(alice).activate(1, [aapl, tsla, nvda, msft])).to.be.revertedWithCustomError(
      controller,
      "WrongNumberOfPicks"
    );

    // Duplicate assets
    await expect(controller.connect(alice).activate(1, [aapl, tsla, aapl])).to.be.revertedWithCustomError(
      controller,
      "DuplicatePick"
    );

    // Unregistered asset
    await expect(controller.connect(alice).activate(1, [aapl, tsla, owner.address])).to.be.revertedWithCustomError(
      controller,
      "AssetNotSelectable"
    );

    // Zero address
    await expect(controller.connect(alice).activate(1, [aapl, tsla, ethers.ZeroAddress])).to.be.revertedWithCustomError(
      controller,
      "AssetNotSelectable"
    );

    // Non-owner activation
    await expect(controller.connect(bob).activate(1, [aapl, tsla, nvda])).to.be.revertedWithCustomError(
      controller,
      "NotNFTOwner"
    );

    // Verify 100 BANANA was NOT burned on any failure
    const bananaAfter = await banana.balanceOf(alice.address);
    expect(bananaAfter).to.equal(bananaBefore);
  });
});
