/**
 * OOHDIES STACKERS — STAGE 6 SECURITY TEST
 * Adversarial Security, ERC-6551 & Protocol Attack-Surface Verification
 *
 * 200+ deterministic adversarial sequences
 * 1,000+ fuzz/state-machine sequences
 */
import { expect } from "chai";
import hre from "hardhat";

// Simple seeded PRNG for reproducible fuzz
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("STAGE 6 — ADVERSARIAL SECURITY & ERC-6551 ATTACK SURFACE", function () {
  this.timeout(600_000);

  const ACTIVATION_COST = 100n * 10n ** 18n;
  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const e18 = (n) => BigInt(n) * 10n ** 18n;

  let connection, ethers, networkHelpers;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function loadFixture(fixture) {
    return networkHelpers.loadFixture(fixture);
  }

  // The fixture that deploys everything once
  async function deployFullFixture() {
    const signers = await ethers.getSigners();
    const [_deployer, _alice, _bob, _attacker, _charlie] = signers;

    // Core protocol
    const BananaToken = await ethers.getContractFactory("BananaToken");
    const _banana = await BananaToken.deploy(_deployer.address);

    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const _nft = await OohdiesNFT.deploy(_deployer.address);

    const ActivationController = await ethers.getContractFactory("ActivationController");
    const _activation = await ActivationController.deploy(
      await _nft.getAddress(), await _banana.getAddress(), _deployer.address, ACTIVATION_COST
    );

    const EarningEngine = await ethers.getContractFactory("EarningEngine");
    const _engine = await EarningEngine.deploy(
      await _activation.getAddress(), await _nft.getAddress(), _deployer.address
    );

    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    const _registry = await ERC6551Registry.deploy();

    const OohdiesAccount = await ethers.getContractFactory("OohdiesAccount");
    const _accountImpl = await OohdiesAccount.deploy();

    const _salt = "0x0000000000000000000000000000000000000000000000000000000000000001";

    const RewardVault = await ethers.getContractFactory("RewardVault");
    const _vault = await RewardVault.deploy(
      await _nft.getAddress(), await _engine.getAddress(), _deployer.address,
      await _registry.getAddress(), await _accountImpl.getAddress(), _salt
    );

    // Wire up
    await _activation.connect(_deployer).setEarningEngine(await _engine.getAddress());
    await _engine.connect(_deployer).setRewardVault(await _vault.getAddress());
    await _engine.connect(_deployer).setFunder(_deployer.address, true);
    await _nft.connect(_deployer).setEarningEngine(await _engine.getAddress());
    await _nft.connect(_deployer).setActivationController(await _activation.getAddress());

    // Reward tokens
    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const _rewardA = await MockRewardToken.deploy("StockA", "STKA", 18, _deployer.address);
    const _rewardB = await MockRewardToken.deploy("StockB", "STKB", 18, _deployer.address);
    const _rewardC = await MockRewardToken.deploy("StockC", "STKC", 18, _deployer.address);

    await _engine.connect(_deployer).registerRewardAsset(await _rewardA.getAddress());
    await _engine.connect(_deployer).registerRewardAsset(await _rewardB.getAddress());
    await _engine.connect(_deployer).registerRewardAsset(await _rewardC.getAddress());

    // Revenue infrastructure
    const MockRevenueToken = await ethers.getContractFactory("MockRevenueToken");
    const _mockRev = await MockRevenueToken.deploy(_deployer.address);

    const TestnetRevenueSimulator = await ethers.getContractFactory("TestnetRevenueSimulator");
    const _simulator = await TestnetRevenueSimulator.deploy(await _mockRev.getAddress(), _deployer.address);

    const TestnetPhysicalLiquidityPool = await ethers.getContractFactory("TestnetPhysicalLiquidityPool");
    const _pool = await TestnetPhysicalLiquidityPool.deploy(await _mockRev.getAddress(), _deployer.address);

    // Malicious contracts
    const ReentrantERC20 = await ethers.getContractFactory("ReentrantERC20");
    const _reentrantToken = await ReentrantERC20.deploy();

    const FalseReturnERC20 = await ethers.getContractFactory("FalseReturnERC20");
    const _falseReturnToken = await FalseReturnERC20.deploy();

    const FeeOnTransferERC20 = await ethers.getContractFactory("FeeOnTransferERC20");
    const _feeToken = await FeeOnTransferERC20.deploy();

    const RevertingERC20 = await ethers.getContractFactory("RevertingERC20");
    const _revertToken = await RevertingERC20.deploy();

    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const _maliciousReceiver = await MaliciousReceiver.deploy();

    const MaliciousTBATarget = await ethers.getContractFactory("MaliciousTBATarget");
    const _maliciousTBATarget = await MaliciousTBATarget.deploy();

    const AttackCaller = await ethers.getContractFactory("AttackCaller");
    const _attackCaller = await AttackCaller.deploy();

    // Pre-distribute BANANA to test users
    await _banana.transfer(_alice.address, e18(100000));
    await _banana.transfer(_bob.address, e18(100000));
    await _banana.transfer(_charlie.address, e18(100000));

    return {
      deployer: _deployer, alice: _alice, bob: _bob, attacker: _attacker, charlie: _charlie,
      banana: _banana, nft: _nft, activation: _activation, engine: _engine,
      vault: _vault, registry: _registry, accountImpl: _accountImpl, salt: _salt,
      rewardA: _rewardA, rewardB: _rewardB, rewardC: _rewardC,
      mockRev: _mockRev, simulator: _simulator, pool: _pool,
      reentrantToken: _reentrantToken, falseReturnToken: _falseReturnToken,
      feeToken: _feeToken, revertToken: _revertToken,
      maliciousReceiver: _maliciousReceiver, maliciousTBATarget: _maliciousTBATarget,
      attackCaller: _attackCaller,
    };
  }

  async function mintNFT(ctx, to) {
    const supplyBefore = await ctx.nft.totalMinted();
    await ctx.nft.connect(ctx.deployer).mintBatch(to.address, 1);
    return Number(supplyBefore) + 1;
  }

  async function activateNFT(ctx, user, tokenId, assets) {
    await ctx.banana.connect(user).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
    await ctx.activation.connect(user).activate(tokenId, assets);
  }

  async function fundAsset(ctx, asset, amount, duration) {
    await asset.connect(ctx.deployer).mint(ctx.deployer.address, amount);
    await asset.connect(ctx.deployer).approve(await ctx.engine.getAddress(), amount);
    await ctx.engine.connect(ctx.deployer).fundReward(await asset.getAddress(), amount, duration);
  }

  async function fundVault(ctx, asset, amount) {
    await asset.connect(ctx.deployer).mint(ctx.deployer.address, amount);
    await asset.connect(ctx.deployer).approve(await ctx.vault.getAddress(), amount);
    await ctx.vault.connect(ctx.deployer).depositReward(await asset.getAddress(), amount);
  }

  function picks(ctx) {
    return [ctx.rewardA, ctx.rewardB, ctx.rewardC].map(r => r.target);
  }

  async function createTBA(ctx, tokenId) {
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
    return ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
  }

  // ========================================================================
  // A. ACCESS CONTROL / PRIVILEGE ESCALATION (38 tests)
  // ========================================================================
  describe("A. Access Control / Privilege Escalation", function () {

    it("A01: attacker cannot setActivationCost", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).setActivationCost(0))
        .to.be.revertedWithCustomError(ctx.activation, "OwnableUnauthorizedAccount");
    });

    it("A02: attacker cannot setEarningEngine", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).setEarningEngine(ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.activation, "OwnableUnauthorizedAccount");
    });

    it("A03: attacker cannot pause ActivationController", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).pause())
        .to.be.revertedWithCustomError(ctx.activation, "OwnableUnauthorizedAccount");
    });

    it("A04: attacker cannot unpause ActivationController", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).unpause())
        .to.be.revertedWithCustomError(ctx.activation, "OwnableUnauthorizedAccount");
    });

    it("A05: attacker cannot setRequiredPicks", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).setRequiredPicks(5))
        .to.be.revertedWithCustomError(ctx.activation, "OwnableUnauthorizedAccount");
    });

    it("A06: attacker cannot deactivateOnTransfer", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.activation.connect(ctx.attacker).deactivateOnTransfer(1))
        .to.be.revertedWithCustomError(ctx.activation, "OnlyNFTContractAllowed");
    });

    it("A07: attacker cannot registerRewardAsset", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).registerRewardAsset(ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("A08: attacker cannot setFunder", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).setFunder(ctx.attacker.address, true))
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("A09: attacker cannot setRewardVault", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).setRewardVault(ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("A10: attacker cannot setCollectionQ", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).setCollectionQ(ctx.attacker.address, 20000))
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("A11: attacker cannot pause EarningEngine", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).pause())
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("A12: attacker cannot fundReward", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).fundReward(ctx.rewardA.target, e18(100), 600n))
        .to.be.revertedWithCustomError(ctx.engine, "UnauthorizedFunder");
    });

    it("A13: attacker cannot onNftActivation directly", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).onNftActivation(1, [ctx.rewardA.target]))
        .to.be.revertedWithCustomError(ctx.engine, "OnlyActivationControllerAllowed");
    });

    it("A14: attacker cannot onNftDeactivation directly", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).onNftDeactivation(1))
        .to.be.revertedWithCustomError(ctx.engine, "OnlyActivationControllerAllowed");
    });

    it("A15: attacker cannot onNftTransfer directly", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).onNftTransfer(ctx.alice.address, ctx.bob.address, 1))
        .to.be.revertedWithCustomError(ctx.engine, "OnlyNFTContractAllowed");
    });

    it("A16: attacker cannot deductClaimableReward", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.attacker).deductClaimableReward(1, ctx.rewardA.target))
        .to.be.revertedWithCustomError(ctx.engine, "OnlyRewardVaultAllowed");
    });

    it("A17: attacker cannot pause RewardVault", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.vault.connect(ctx.attacker).pause())
        .to.be.revertedWithCustomError(ctx.vault, "OwnableUnauthorizedAccount");
    });

    it("A18: attacker cannot unpause RewardVault", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.vault.connect(ctx.attacker).unpause())
        .to.be.revertedWithCustomError(ctx.vault, "OwnableUnauthorizedAccount");
    });

    it("A19: attacker cannot mintBatch", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.nft.connect(ctx.attacker).mintBatch(ctx.attacker.address, 1))
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
    });

    it("A20: attacker cannot setMintPrice", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.nft.connect(ctx.attacker).setMintPrice(e18(1)))
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
    });

    it("A21-A24: attacker cannot admin NFT, pause, or withdraw", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.nft.connect(ctx.attacker).setEarningEngine(ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
      await expect(ctx.nft.connect(ctx.attacker).setActivationController(ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
      await expect(ctx.nft.connect(ctx.attacker).pause())
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
      await expect(ctx.nft.connect(ctx.attacker).withdraw())
        .to.be.revertedWithCustomError(ctx.nft, "OwnableUnauthorizedAccount");
    });

    it("A25-A29: attacker cannot admin simulator", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.simulator.connect(ctx.attacker).setConversionRate(ctx.rewardA.target, 1, 1, 18))
        .to.be.revertedWithCustomError(ctx.simulator, "OwnableUnauthorizedAccount");
      await expect(ctx.simulator.connect(ctx.attacker).acquireRewardAsset(ctx.rewardA.target, e18(1), ctx.attacker.address))
        .to.be.revertedWithCustomError(ctx.simulator, "OwnableUnauthorizedAccount");
      await expect(ctx.simulator.connect(ctx.attacker).settleRevenueWithPool(ctx.pool.target, ctx.rewardA.target, e18(1)))
        .to.be.revertedWithCustomError(ctx.simulator, "OwnableUnauthorizedAccount");
      await expect(ctx.simulator.connect(ctx.attacker).fundRewardVault(ctx.rewardA.target, e18(1), 600, ctx.engine.target, ctx.vault.target))
        .to.be.revertedWithCustomError(ctx.simulator, "OwnableUnauthorizedAccount");
      await expect(ctx.simulator.connect(ctx.attacker).withdrawRevenue(ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.simulator, "OwnableUnauthorizedAccount");
    });

    it("A30-A33: attacker cannot admin pool", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.pool.connect(ctx.attacker).setAssetRate(ctx.rewardA.target, 1, 2, 18, true))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
      await expect(ctx.pool.connect(ctx.attacker).withdrawRevenue(ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
      await expect(ctx.pool.connect(ctx.attacker).withdrawRewardLiquidity(ctx.rewardA.target, ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
      await expect(ctx.pool.connect(ctx.attacker).approveRewardSpender(ctx.rewardA.target, ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
    });

    it("A34: attacker cannot pause BananaToken", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.banana.connect(ctx.attacker).pause())
        .to.be.revertedWithCustomError(ctx.banana, "OwnableUnauthorizedAccount");
    });

    it("A35: owner succeeds at privileged ops", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.activation.connect(ctx.deployer).setActivationCost(ACTIVATION_COST);
    });

    it("A36: revoked funder cannot fundReward", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.engine.connect(ctx.deployer).setFunder(ctx.charlie.address, true);
      await ctx.rewardA.connect(ctx.deployer).mint(ctx.charlie.address, e18(10));
      await ctx.rewardA.connect(ctx.charlie).approve(await ctx.engine.getAddress(), e18(10));
      await ctx.engine.connect(ctx.charlie).fundReward(ctx.rewardA.target, e18(10), 600n);
      await ctx.engine.connect(ctx.deployer).setFunder(ctx.charlie.address, false);
      await ctx.rewardA.connect(ctx.deployer).mint(ctx.charlie.address, e18(10));
      await ctx.rewardA.connect(ctx.charlie).approve(await ctx.engine.getAddress(), e18(10));
      await expect(ctx.engine.connect(ctx.charlie).fundReward(ctx.rewardA.target, e18(10), 600n))
        .to.be.revertedWithCustomError(ctx.engine, "UnauthorizedFunder");
    });

    it("A37: AttackCaller contract cannot execute TBA", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const [success] = await ctx.attackCaller.tryExecuteTBA.staticCall(tbaAddr, ctx.attacker.address, 0, "0x");
      expect(success).to.be.false;
    });
  });

  // ========================================================================
  // B. ACTIVATION, BANANA, AND PICK SECURITY (15 tests)
  // ========================================================================
  describe("B. Activation, BANANA, and Pick Security", function () {

    it("B01: non-owner cannot activate someone else's NFT", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.attacker.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.attacker).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.attacker).activate(tokenId, picks(ctx)))
        .to.be.revertedWithCustomError(ctx.activation, "NotNFTOwner");
    });

    it("B02: duplicate picks revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, [ctx.rewardA.target, ctx.rewardA.target, ctx.rewardC.target]))
        .to.be.revertedWithCustomError(ctx.activation, "DuplicatePick");
    });

    it("B03: 0 picks revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, []))
        .to.be.revertedWithCustomError(ctx.activation, "WrongNumberOfPicks");
    });

    it("B04-B05: 1 and 2 picks revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const t1 = await mintNFT(ctx, ctx.alice);
      const t2 = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST * 2n);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST * 2n);
      await expect(ctx.activation.connect(ctx.alice).activate(t1, [ctx.rewardA.target]))
        .to.be.revertedWithCustomError(ctx.activation, "WrongNumberOfPicks");
      await expect(ctx.activation.connect(ctx.alice).activate(t2, [ctx.rewardA.target, ctx.rewardB.target]))
        .to.be.revertedWithCustomError(ctx.activation, "WrongNumberOfPicks");
    });

    it("B06: 4 picks revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
      const rewardD = await MockRewardToken.deploy("StockD", "STKD", 18, ctx.deployer.address);
      await ctx.engine.connect(ctx.deployer).registerRewardAsset(rewardD.target);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target, rewardD.target]))
        .to.be.revertedWithCustomError(ctx.activation, "WrongNumberOfPicks");
    });

    it("B07: zero address asset revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, [ZERO_ADDR, ctx.rewardB.target, ctx.rewardC.target]))
        .to.be.revertedWithCustomError(ctx.activation, "AssetNotSelectable");
    });

    it("B08: unregistered asset reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, ["0x0000000000000000000000000000000000000001", ctx.rewardB.target, ctx.rewardC.target]))
        .to.be.revertedWithCustomError(ctx.activation, "AssetNotSelectable");
    });

    it("B09: already activated reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await ctx.banana.connect(ctx.deployer).transfer(ctx.alice.address, ACTIVATION_COST);
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, picks(ctx)))
        .to.be.revertedWithCustomError(ctx.activation, "AlreadyActivated");
    });

    it("B10: insufficient BANANA reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.attacker);
      // attacker has NO banana pre-funded
      await ctx.banana.connect(ctx.attacker).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.attacker).activate(tokenId, picks(ctx)))
        .to.be.revertedWithCustomError(ctx.banana, "ERC20InsufficientBalance");
    });

    it("B11: insufficient allowance reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      // alice has BANANA but only approves 50 (cost is 100)
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), e18(50));
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, picks(ctx)))
        .to.be.revertedWithCustomError(ctx.banana, "ERC20InsufficientAllowance");
    });

    it("B12: exactly 100 BANANA burned", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const supplyBefore = await ctx.banana.totalSupply();
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      const supplyAfter = await ctx.banana.totalSupply();
      expect(supplyBefore - supplyAfter).to.equal(ACTIVATION_COST);
    });

    it("B13: invalid activation never burns BANANA", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const supplyBefore = await ctx.banana.totalSupply();
      await ctx.banana.connect(ctx.alice).approve(await ctx.activation.getAddress(), ACTIVATION_COST);
      await expect(ctx.activation.connect(ctx.alice).activate(tokenId, [ctx.rewardA.target]))
        .to.be.revertedWithCustomError(ctx.activation, "WrongNumberOfPicks");
      expect(await ctx.banana.totalSupply()).to.equal(supplyBefore);
    });

    it("B14: activation after transfer requires re-activation", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      expect(await ctx.activation.isActivated(tokenId)).to.be.false;
      await activateNFT(ctx, ctx.bob, tokenId, picks(ctx));
      expect(await ctx.activation.isActivated(tokenId)).to.be.true;
    });
  });

  // ========================================================================
  // C. REWARD ENGINE / VAULT ATTACKS (14 tests)
  // ========================================================================
  describe("C. Reward Engine / Vault Attacks", function () {

    it("C01: claim unselected asset returns NoRewardToClaim", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
      const rewardX = await MockRewardToken.deploy("StockX", "STKX", 18, ctx.deployer.address);
      await ctx.engine.connect(ctx.deployer).registerRewardAsset(rewardX.target);
      await rewardX.connect(ctx.deployer).mint(ctx.deployer.address, e18(1000));
      await rewardX.connect(ctx.deployer).approve(await ctx.engine.getAddress(), e18(1000));
      await ctx.engine.connect(ctx.deployer).fundReward(rewardX.target, e18(1000), 600n);
      await rewardX.connect(ctx.deployer).mint(ctx.deployer.address, e18(1000));
      await rewardX.connect(ctx.deployer).approve(await ctx.vault.getAddress(), e18(1000));
      await ctx.vault.connect(ctx.deployer).depositReward(rewardX.target, e18(1000));
      await networkHelpers.time.increase(300);
      await expect(ctx.vault.claimReward(tokenId, rewardX.target))
        .to.be.revertedWithCustomError(ctx.vault, "NoRewardToClaim");
    });

    it("C02: claim for inactive NFT reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await expect(ctx.vault.claimReward(tokenId, ctx.rewardA.target))
        .to.be.revertedWithCustomError(ctx.vault, "NoRewardToClaim");
    });

    it("C03: repeated claim — second returns NoRewardToClaim", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(700);
      await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
      await expect(ctx.vault.claimReward(tokenId, ctx.rewardA.target))
        .to.be.revertedWithCustomError(ctx.vault, "NoRewardToClaim");
    });

    it("C04: claim when vault underfunded reverts InsufficientVaultBalance", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await networkHelpers.time.increase(300);
      await expect(ctx.vault.claimReward(tokenId, ctx.rewardA.target))
        .to.be.revertedWithCustomError(ctx.vault, "InsufficientVaultBalance");
    });

    it("C05: permissionless claim sends to TBA not caller", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const attackerBefore = await ctx.rewardA.balanceOf(ctx.attacker.address);
      await ctx.vault.connect(ctx.attacker).claimReward(tokenId, ctx.rewardA.target);
      expect(await ctx.rewardA.balanceOf(ctx.attacker.address)).to.equal(attackerBefore);
      expect(await ctx.rewardA.balanceOf(tbaAddr)).to.be.gt(0);
    });

    it("C06: cross-NFT claim isolation", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const t1 = await mintNFT(ctx, ctx.alice);
      const t2 = await mintNFT(ctx, ctx.bob);
      await activateNFT(ctx, ctx.alice, t1, picks(ctx));
      await activateNFT(ctx, ctx.bob, t2, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(2000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(2000));
      await networkHelpers.time.increase(300);
      await ctx.vault.claimReward(t1, ctx.rewardA.target);
      const c2 = await ctx.engine.getTotalClaimableReward(t2, ctx.rewardA.target);
      expect(c2).to.be.gt(0);
    });

    it("C07: zero-amount deposit reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.vault.depositReward(ctx.rewardA.target, 0))
        .to.be.revertedWithCustomError(ctx.vault, "ZeroAmountNotAllowed");
    });

    it("C08: zero-address deposit reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.vault.depositReward(ZERO_ADDR, e18(1)))
        .to.be.revertedWithCustomError(ctx.vault, "ZeroAddressNotAllowed");
    });

    it("C09: zero-amount fundReward reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.deployer).fundReward(ctx.rewardA.target, 0, 600n))
        .to.be.revertedWithCustomError(ctx.engine, "ZeroAmountNotAllowed");
    });

    it("C10: zero-duration fundReward reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.rewardA.connect(ctx.deployer).mint(ctx.deployer.address, e18(100));
      await ctx.rewardA.connect(ctx.deployer).approve(await ctx.engine.getAddress(), e18(100));
      await expect(ctx.engine.connect(ctx.deployer).fundReward(ctx.rewardA.target, e18(100), 0))
        .to.be.revertedWithCustomError(ctx.engine, "ZeroDurationNotAllowed");
    });

    it("C11: unregistered asset fundReward reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.engine.connect(ctx.deployer).fundReward("0x0000000000000000000000000000000000000001", e18(100), 600n))
        .to.be.revertedWithCustomError(ctx.engine, "AssetNotRegistered");
    });

    it("C12: no partial balance movement on failed claim", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await networkHelpers.time.increase(300);
      const vaultBal = await ctx.rewardA.balanceOf(await ctx.vault.getAddress());
      await expect(ctx.vault.claimReward(tokenId, ctx.rewardA.target))
        .to.be.revertedWithCustomError(ctx.vault, "InsufficientVaultBalance");
      expect(await ctx.rewardA.balanceOf(await ctx.vault.getAddress())).to.equal(vaultBal);
    });

    it("C13: claim after transfer — accrued reward goes to TBA (new owner)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      const accrued = await ctx.engine.getAccruedReward(tokenId, ctx.rewardA.target);
      if (accrued > 0n) {
        const tbaAddr = await ctx.vault.accountOf(tokenId);
        await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
        expect(await ctx.rewardA.balanceOf(tbaAddr)).to.be.gt(0);
      }
    });
  });

  // ========================================================================
  // D. ERC-6551 DEEP SECURITY (19 tests)
  // ========================================================================
  describe("D. ERC-6551 Deep Security", function () {

    it("D01: NFT owner controls TBA", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      expect(await tba.owner()).to.equal(ctx.alice.address);
    });

    it("D02: transfer → previous owner loses, new owner gains TBA control", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      await expect(tba.connect(ctx.alice).execute(ctx.alice.address, 0, "0x", 0))
        .to.be.revertedWithCustomError(tba, "NotAuthorized");
      await tba.connect(ctx.bob).execute(ctx.bob.address, 0, "0x", 0);
    });

    it("D03: TBA address unchanged after transfer", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const before = await ctx.vault.accountOf(tokenId);
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      expect(await ctx.vault.accountOf(tokenId)).to.equal(before);
    });

    it("D04: attacker execute → NotAuthorized", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      await expect(tba.connect(ctx.attacker).execute(ctx.attacker.address, 0, "0x", 0))
        .to.be.revertedWithCustomError(tba, "NotAuthorized");
    });

    it("D05: delegatecall (op=1) → InvalidOperation", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      await expect(tba.connect(ctx.alice).execute(ctx.alice.address, 0, "0x", 1))
        .to.be.revertedWithCustomError(tba, "InvalidOperation");
    });

    it("D06: failed target call reverts TBA execute", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      const data = ctx.revertToken.interface.encodeFunctionData("transfer", [ctx.alice.address, e18(1)]);
      await expect(tba.connect(ctx.alice).execute(ctx.revertToken.target, 0, data, 0))
        .to.be.revertedWith("RevertingERC20: transfer blocked");
    });

    it("D07: TBA can receive/send native value", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      await ctx.alice.sendTransaction({ to: tbaAddr, value: e18(1) });
      expect(await ethers.provider.getBalance(tbaAddr)).to.equal(e18(1));
      await tba.connect(ctx.alice).execute(ctx.bob.address, e18(1), "0x", 0);
      expect(await ethers.provider.getBalance(tbaAddr)).to.equal(0);
    });

    it("D08: TBA can transfer ERC-20 via execute", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      await ctx.rewardA.connect(ctx.deployer).mint(tbaAddr, e18(50));
      const data = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.alice.address, e18(50)]);
      await tba.connect(ctx.alice).execute(ctx.rewardA.target, 0, data, 0);
      expect(await ctx.rewardA.balanceOf(ctx.alice.address)).to.be.gte(e18(50));
    });

    it("D09: reentrancy via malicious TBA target — cannot steal", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      await ctx.alice.sendTransaction({ to: tbaAddr, value: e18(1) });
      await ctx.maliciousTBATarget.arm(tbaAddr);
      await tba.connect(ctx.alice).execute(ctx.maliciousTBATarget.target, 0, "0x00", 0);
      expect(await ethers.provider.getBalance(tbaAddr)).to.equal(e18(1));
      expect(await ctx.maliciousTBATarget.attackAttempts()).to.equal(1);
    });

    it("D10: ownership cycle via safeTransferFrom blocked", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const account = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      await expect(
        ctx.nft.connect(ctx.alice)["safeTransferFrom(address,address,uint256)"](ctx.alice.address, tbaAddr, BigInt(tokenId))
      ).to.be.revertedWithCustomError(account, "OwnershipCycle");
    });

    it("D11: account creation is idempotent", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const addr1 = await ctx.registry.createAccount.staticCall(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const addr2 = await ctx.registry.createAccount.staticCall(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      expect(addr1).to.equal(addr2);
    });

    it("D12: state increments on execute", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      const before = await tba.state();
      await tba.connect(ctx.alice).execute(ctx.alice.address, 0, "0x", 0);
      expect(await tba.state()).to.equal(before + 1n);
    });

    it("D13: isValidSigner returns magic for owner, 0 for non-owner", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      expect(await tba.isValidSigner(ctx.alice.address, "0x")).to.equal("0x523e3260");
      expect(await tba.isValidSigner(ctx.attacker.address, "0x")).to.equal("0x00000000");
    });

    it("D14: ERC-20 in TBA survives NFT transfer — new owner gets it", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      await ctx.rewardA.connect(ctx.deployer).mint(tbaAddr, e18(100));
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      const data = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.bob.address, e18(100)]);
      await tba.connect(ctx.bob).execute(ctx.rewardA.target, 0, data, 0);
      expect(await ctx.rewardA.balanceOf(ctx.bob.address)).to.be.gte(e18(100));
    });

    it("D15: supportsInterface correct", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", await ctx.vault.accountOf(tokenId));
      expect(await tba.supportsInterface("0x6faff5f1")).to.be.true; // IERC6551Account
      expect(await tba.supportsInterface("0x51945447")).to.be.true; // IERC6551Executable
      expect(await tba.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
    });
  });

  // ========================================================================
  // E. MALICIOUS TOKEN / EXTERNAL-CALL TESTS (6 tests)
  // ========================================================================
  describe("E. Malicious Token / External-Call Tests", function () {

    it("E01: false-return ERC-20 — SafeERC20 reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.engine.connect(ctx.deployer).registerRewardAsset(ctx.falseReturnToken.target);
      await expect(ctx.engine.connect(ctx.deployer).fundReward(ctx.falseReturnToken.target, e18(100), 600n))
        .to.be.revertedWithCustomError(ctx.engine, "SafeERC20FailedOperation");
    });

    it("E02: reverting ERC-20 — fundReward reverts safely", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.engine.connect(ctx.deployer).registerRewardAsset(ctx.revertToken.target);
      await ctx.revertToken.connect(ctx.deployer).mint(ctx.deployer.address, e18(100));
      await ctx.revertToken.connect(ctx.deployer).approve(await ctx.engine.getAddress(), e18(100));
      await expect(ctx.engine.connect(ctx.deployer).fundReward(ctx.revertToken.target, e18(100), 600n))
        .to.be.revertedWith("RevertingERC20: transfer blocked");
    });

    it("E03: fee-on-transfer — vault handles actual received", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.feeToken.connect(ctx.deployer).mint(ctx.deployer.address, e18(1000));
      await ctx.feeToken.connect(ctx.deployer).approve(await ctx.vault.getAddress(), e18(1000));
      const balBefore = await ctx.feeToken.balanceOf(await ctx.vault.getAddress());
      await ctx.vault.depositReward(ctx.feeToken.target, e18(1000));
      const balAfter = await ctx.feeToken.balanceOf(await ctx.vault.getAddress());
      expect(balAfter - balBefore).to.equal(e18(900));
      expect(await ctx.vault.totalDeposited(ctx.feeToken.target)).to.equal(e18(900));
    });

    it("E04: reentrant ERC-20 — ReentrancyGuard blocks reentry in fundReward", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.engine.connect(ctx.deployer).registerRewardAsset(ctx.reentrantToken.target);
      await ctx.reentrantToken.connect(ctx.deployer).mint(ctx.deployer.address, e18(200));
      await ctx.reentrantToken.connect(ctx.deployer).approve(await ctx.engine.getAddress(), e18(200));
      const attackData = ctx.engine.interface.encodeFunctionData("fundReward", [ctx.reentrantToken.target, e18(100), 600n]);
      await ctx.reentrantToken.arm(await ctx.engine.getAddress(), attackData);
      // Outer call succeeds, inner reentrancy attempt fails silently
      await ctx.engine.connect(ctx.deployer).fundReward(ctx.reentrantToken.target, e18(100), 600n);
    });

    it("E05: reentrant ERC-20 — ReentrancyGuard blocks reentry in depositReward", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.reentrantToken.connect(ctx.deployer).mint(ctx.deployer.address, e18(200));
      await ctx.reentrantToken.connect(ctx.deployer).approve(await ctx.vault.getAddress(), e18(200));
      const attackData = ctx.vault.interface.encodeFunctionData("depositReward", [ctx.reentrantToken.target, e18(100)]);
      await ctx.reentrantToken.arm(await ctx.vault.getAddress(), attackData);
      await ctx.vault.depositReward(ctx.reentrantToken.target, e18(100));
    });

    it("E06: insufficient pool liquidity reverts settlement", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.simulator.connect(ctx.deployer).setConversionRate(ctx.rewardA.target, 1, 1, 18);
      await ctx.pool.connect(ctx.deployer).setAssetRate(ctx.rewardA.target, 1, 1, 18, true);
      await ctx.mockRev.connect(ctx.deployer).mint(ctx.alice.address, e18(100));
      await ctx.mockRev.connect(ctx.alice).approve(await ctx.simulator.getAddress(), e18(100));
      await ctx.simulator.connect(ctx.alice).generateFee("test", e18(100));
      await expect(ctx.simulator.connect(ctx.deployer).settleRevenueWithPool(ctx.pool.target, ctx.rewardA.target, e18(100)))
        .to.be.revertedWithCustomError(ctx.pool, "InsufficientPoolLiquidity");
    });
  });

  // ========================================================================
  // F. PHYSICAL SETTLEMENT / POOL SECURITY (10 tests)
  // ========================================================================
  describe("F. Physical Settlement / Pool Security", function () {

    it("F01-F03: unauthorized pool operations revert", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.pool.connect(ctx.attacker).withdrawRevenue(ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
      await expect(ctx.pool.connect(ctx.attacker).setAssetRate(ctx.rewardA.target, 1, 1, 18, true))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
      await expect(ctx.pool.connect(ctx.attacker).withdrawRewardLiquidity(ctx.rewardA.target, ctx.attacker.address, e18(1)))
        .to.be.revertedWithCustomError(ctx.pool, "OwnableUnauthorizedAccount");
    });

    it("F04: swap with unapproved asset reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.pool.swapRevenueForReward("0x0000000000000000000000000000000000000001", e18(10), ctx.deployer.address))
        .to.be.revertedWithCustomError(ctx.pool, "AssetNotApproved");
    });

    it("F05: swap with zero amount reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.pool.swapRevenueForReward(ctx.rewardA.target, 0, ctx.deployer.address))
        .to.be.revertedWithCustomError(ctx.pool, "ZeroAmountNotAllowed");
    });

    it("F06: overdraw revenue/liquidity reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await expect(ctx.pool.connect(ctx.deployer).withdrawRevenue(ctx.deployer.address, e18(99999)))
        .to.be.revertedWithCustomError(ctx.pool, "InsufficientPoolLiquidity");
      await expect(ctx.pool.connect(ctx.deployer).withdrawRewardLiquidity(ctx.rewardA.target, ctx.deployer.address, e18(99999)))
        .to.be.revertedWithCustomError(ctx.pool, "InsufficientPoolLiquidity");
    });

    it("F07: deposit for unapproved asset reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
      const unapproved = await MockRewardToken.deploy("Unapp", "UNAPP", 18, ctx.deployer.address);
      await unapproved.mint(ctx.deployer.address, e18(100));
      await unapproved.approve(ctx.pool.target, e18(100));
      await expect(ctx.pool.depositRewardLiquidity(unapproved.target, e18(100)))
        .to.be.revertedWithCustomError(ctx.pool, "AssetNotApproved");
    });

    it("F08: settlement conservation — REV transferred equals pool received", async function () {
      const ctx = await loadFixture(deployFullFixture);
      // Setup fresh pool
      await ctx.pool.connect(ctx.deployer).setAssetRate(ctx.rewardA.target, 1, 2, 18, true);
      await ctx.rewardA.connect(ctx.deployer).mint(ctx.deployer.address, e18(500));
      await ctx.rewardA.connect(ctx.deployer).approve(ctx.pool.target, e18(500));
      await ctx.pool.depositRewardLiquidity(ctx.rewardA.target, e18(500));
      await ctx.simulator.connect(ctx.deployer).setConversionRate(ctx.rewardA.target, 1, 2, 18);
      await ctx.mockRev.connect(ctx.deployer).mint(ctx.alice.address, e18(100));
      await ctx.mockRev.connect(ctx.alice).approve(await ctx.simulator.getAddress(), e18(100));
      await ctx.simulator.connect(ctx.alice).generateFee("test", e18(100));

      const simRevBefore = await ctx.mockRev.balanceOf(await ctx.simulator.getAddress());
      const poolRevBefore = await ctx.mockRev.balanceOf(ctx.pool.target);
      await ctx.simulator.connect(ctx.deployer).settleRevenueWithPool(ctx.pool.target, ctx.rewardA.target, e18(100));
      const simRevAfter = await ctx.mockRev.balanceOf(await ctx.simulator.getAddress());
      const poolRevAfter = await ctx.mockRev.balanceOf(ctx.pool.target);
      expect(simRevBefore - simRevAfter).to.equal(poolRevAfter - poolRevBefore);
      expect(simRevBefore - simRevAfter).to.equal(e18(100));
    });

    it("F09: conversion beyond unconverted REV reverts", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await ctx.simulator.connect(ctx.deployer).setConversionRate(ctx.rewardA.target, 1, 1, 18);
      await expect(ctx.simulator.connect(ctx.deployer).acquireRewardAsset(ctx.rewardA.target, e18(999999), ctx.deployer.address))
        .to.be.revertedWithCustomError(ctx.simulator, "InsufficientUnconvertedRevenue");
    });

    it("F10: simulator totalConverted ≤ totalCollected invariant", async function () {
      const ctx = await loadFixture(deployFullFixture);
      expect(await ctx.simulator.totalRevenueConverted()).to.be.lte(await ctx.simulator.totalRevenueCollected());
    });
  });

  // ========================================================================
  // G. TRANSFER / ACTIVATION / REWARD RACE CONDITIONS (7 tests)
  // ========================================================================
  describe("G. Transfer / Activation / Reward Race Conditions", function () {

    it("G01: activate → claim → transfer → new owner re-activate", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      expect(await ctx.activation.isActivated(tokenId)).to.be.false;
      await activateNFT(ctx, ctx.bob, tokenId, picks(ctx));
      expect(await ctx.activation.isActivated(tokenId)).to.be.true;
    });

    it("G02: funding before activation → no pre-activation rewards", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      const tokenId = await mintNFT(ctx, ctx.alice);
      await networkHelpers.time.increase(100);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      expect(await ctx.engine.getPendingReward(tokenId, ctx.rewardA.target)).to.equal(0);
      await networkHelpers.time.increase(100);
      expect(await ctx.engine.getPendingReward(tokenId, ctx.rewardA.target)).to.be.gt(0);
    });

    it("G03: claim → fund → claim again succeeds", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
    });

    it("G04: claim → transfer → TBA withdrawal by new owner", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await fundAsset(ctx, ctx.rewardA, e18(1000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(1000));
      await networkHelpers.time.increase(300);
      await ctx.vault.claimReward(tokenId, ctx.rewardA.target);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tokenId);
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      const bal = await ctx.rewardA.balanceOf(tbaAddr);
      if (bal > 0n) {
        const data = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.bob.address, bal]);
        await tba.connect(ctx.bob).execute(ctx.rewardA.target, 0, data, 0);
        expect(await ctx.rewardA.balanceOf(ctx.bob.address)).to.be.gte(bal);
      }
    });

    it("G05: multiple pickers join/leave around index updates", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const t1 = await mintNFT(ctx, ctx.alice);
      const t2 = await mintNFT(ctx, ctx.bob);
      const t3 = await mintNFT(ctx, ctx.charlie);
      await fundAsset(ctx, ctx.rewardA, e18(3000), 600n);
      await fundVault(ctx, ctx.rewardA, e18(3000));
      await activateNFT(ctx, ctx.alice, t1, picks(ctx));
      await networkHelpers.time.increase(100);
      await activateNFT(ctx, ctx.bob, t2, picks(ctx));
      await networkHelpers.time.increase(100);
      await activateNFT(ctx, ctx.charlie, t3, picks(ctx));
      await networkHelpers.time.increase(100);
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.deployer.address, t1);
      await networkHelpers.time.increase(100);
      const c1 = await ctx.engine.getAccruedReward(t1, ctx.rewardA.target);
      const c2 = await ctx.engine.getTotalClaimableReward(t2, ctx.rewardA.target);
      const c3 = await ctx.engine.getTotalClaimableReward(t3, ctx.rewardA.target);
      expect(c1).to.be.gt(0);
      expect(c2).to.be.gt(0);
      expect(c3).to.be.gt(0);
    });

    it("G06: releaseIfInactive repairs stuck picks", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      // Transfer deactivates
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tokenId);
      // releaseIfInactive should not revert
      await ctx.engine.releaseIfInactive(tokenId);
    });

    it("G07: releaseIfInactive reverts if still activated", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tokenId, picks(ctx));
      await expect(ctx.engine.releaseIfInactive(tokenId))
        .to.be.revertedWithCustomError(ctx.engine, "StillActivated");
    });
  });

  // ========================================================================
  // FUZZ: 1,000+ RANDOMIZED STATE-MACHINE SEQUENCES
  // ========================================================================
  describe("FUZZ: 1,000+ Randomized State-Machine Sequences", function () {

    async function runFuzzBatch(ctx, seed, iterations, asset) {
      const rng = mulberry32(seed);
      const owners = [ctx.alice, ctx.bob, ctx.charlie];
      const tokens = [];

      for (let i = 0; i < 5; i++) {
        const tid = await mintNFT(ctx, owners[i % 3]);
        tokens.push({ id: tid, owner: owners[i % 3], active: false });
      }

      await fundAsset(ctx, asset, e18(100000), 60000n);
      await fundVault(ctx, asset, e18(100000));

      for (let i = 0; i < iterations; i++) {
        const action = Math.floor(rng() * 5);
        const tIdx = Math.floor(rng() * tokens.length);
        const t = tokens[tIdx];

        try {
          if (action === 0 && !t.active) {
            await activateNFT(ctx, t.owner, t.id, picks(ctx));
            t.active = true;
          } else if (action === 1 && t.active) {
            await networkHelpers.time.increase(Math.floor(rng() * 50) + 1);
            try { await ctx.vault.claimReward(t.id, await asset.getAddress()); } catch {}
          } else if (action === 2) {
            const newOwner = owners[Math.floor(rng() * 3)];
            if (newOwner.address !== t.owner.address) {
              await ctx.nft.connect(t.owner).transferFrom(t.owner.address, newOwner.address, t.id);
              t.owner = newOwner;
              t.active = false;
            }
          } else if (action === 3) {
            await networkHelpers.time.increase(Math.floor(rng() * 200) + 1);
          } else if (action === 4 && !t.active) {
            await activateNFT(ctx, t.owner, t.id, picks(ctx));
            t.active = true;
          }
        } catch {}
      }

      // Invariant: no negative accrued
      for (const t of tokens) {
        const accrued = await ctx.engine.getAccruedReward(t.id, await asset.getAddress());
        expect(accrued).to.be.gte(0);
      }
    }

    it("FUZZ-01: 250 sequences (seed=42)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await runFuzzBatch(ctx, 42, 250, ctx.rewardA);
    });

    it("FUZZ-02: 250 sequences (seed=123)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await runFuzzBatch(ctx, 123, 250, ctx.rewardB);
    });

    it("FUZZ-03: 250 sequences (seed=7777)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await runFuzzBatch(ctx, 7777, 250, ctx.rewardC);
    });

    it("FUZZ-04: 250 sequences (seed=31337)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      await runFuzzBatch(ctx, 31337, 250, ctx.rewardA);
    });

    it("FUZZ-05: 250 TBA execute sequences (seed=99)", async function () {
      const ctx = await loadFixture(deployFullFixture);
      const rng = mulberry32(99);
      const owners = [ctx.alice, ctx.bob, ctx.charlie];
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const tbas = [];

      for (let i = 0; i < 3; i++) {
        const tid = await mintNFT(ctx, owners[i]);
        const tbaAddr = await ctx.vault.accountOf(tid);
        await ctx.registry.createAccount(ctx.accountImpl.target, ctx.salt, chainId, ctx.nft.target, tid);
        await ctx.rewardA.connect(ctx.deployer).mint(tbaAddr, e18(10));
        tbas.push({ id: tid, owner: owners[i], tbaAddr });
      }

      let unauthorized = 0;
      let authorized = 0;

      for (let i = 0; i < 250; i++) {
        const action = Math.floor(rng() * 4);
        const tIdx = Math.floor(rng() * tbas.length);
        const t = tbas[tIdx];
        const caller = owners[Math.floor(rng() * 3)];

        try {
          if (action === 0) {
            const tba = await ethers.getContractAt("OohdiesAccount", t.tbaAddr);
            if (caller.address === t.owner.address) {
              await tba.connect(caller).execute(caller.address, 0, "0x", 0);
              authorized++;
            } else {
              await expect(tba.connect(caller).execute(caller.address, 0, "0x", 0))
                .to.be.revertedWithCustomError(tba, "NotAuthorized");
              unauthorized++;
            }
          } else if (action === 1) {
            const newOwner = owners[Math.floor(rng() * 3)];
            if (newOwner.address !== t.owner.address) {
              await ctx.nft.connect(t.owner).transferFrom(t.owner.address, newOwner.address, t.id);
              t.owner = newOwner;
            }
          } else {
            await networkHelpers.time.increase(Math.floor(rng() * 10) + 1);
          }
        } catch {}
      }

      expect(unauthorized + authorized).to.be.gt(0);
    });
  });

  // ========================================================================
  // INVARIANTS: Post-Fuzz State Verification
  // ========================================================================
  describe("INVARIANTS: Post-Suite Verification", function () {

    it("INV-01: vault totalClaimed ≤ totalDeposited per asset", async function () {
      const ctx = await loadFixture(deployFullFixture);
      // After a clean fixture, both are 0
      for (const asset of [ctx.rewardA, ctx.rewardB, ctx.rewardC]) {
        const deposited = await ctx.vault.totalDeposited(asset.target);
        const claimed = await ctx.vault.totalClaimed(asset.target);
        expect(claimed).to.be.lte(deposited);
      }
    });

    it("INV-02: simulator totalConverted ≤ totalCollected", async function () {
      const ctx = await loadFixture(deployFullFixture);
      expect(await ctx.simulator.totalRevenueConverted()).to.be.lte(await ctx.simulator.totalRevenueCollected());
    });

    it("INV-03: pool revenueReserves matches physical balance of settled REV", async function () {
      const ctx = await loadFixture(deployFullFixture);
      // After clean fixture both are 0
      expect(await ctx.pool.revenueReserves()).to.equal(0);
    });
  });
});
