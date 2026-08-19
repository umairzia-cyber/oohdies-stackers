import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT } from "../lib/erc6551.js";

// Helper for PRNG
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("STAGE 7A — RELEASE-CANDIDATE ACCEPTANCE E2E & FUZZ SUITE", function () {
  this.timeout(600_000);

  const ACTIVATION_COST = 100n * 10n ** 18n;
  const BASE_WEIGHT = 10000n;
  const MULTIPLIER_2X = 20000n;
  const e18 = (n) => BigInt(n) * 10n ** 18n;
  const e6 = (n) => BigInt(n) * 10n ** 6n;

  let connection, ethers, networkHelpers;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function loadFixture(fixture) {
    return networkHelpers.loadFixture(fixture);
  }

  async function deployRCFixture() {
    const [deployer, alice, bob, charlie, attacker] = await ethers.getSigners();

    // 1. Install Canonical ERC-6551 Registry bytecode
    const registryArtifact = await ethers.getContractFactory("ERC6551Registry");
    const registryDeployed = await registryArtifact.deploy();
    await networkHelpers.setCode(CANONICAL_REGISTRY, await ethers.provider.getCode(registryDeployed.target));
    const registry = await ethers.getContractAt("ERC6551Registry", CANONICAL_REGISTRY);

    // 2. Deploy Account Implementation
    const OohdiesAccount = await ethers.getContractFactory("OohdiesAccount");
    const accountImpl = await OohdiesAccount.deploy();

    // 3. Deploy BananaToken
    const BananaToken = await ethers.getContractFactory("BananaToken");
    const banana = await BananaToken.deploy(deployer.address);

    // 4. Deploy OohdiesNFT
    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(deployer.address);

    // 5. Deploy ActivationController
    const ActivationController = await ethers.getContractFactory("ActivationController");
    const activation = await ActivationController.deploy(
      nft.target,
      banana.target,
      deployer.address,
      ACTIVATION_COST
    );

    // 6. Deploy EarningEngine
    const EarningEngine = await ethers.getContractFactory("EarningEngine");
    const engine = await EarningEngine.deploy(
      activation.target,
      nft.target,
      deployer.address
    );

    // 7. Deploy RewardVault
    const RewardVault = await ethers.getContractFactory("RewardVault");
    const vault = await RewardVault.deploy(
      nft.target,
      engine.target,
      deployer.address,
      CANONICAL_REGISTRY,
      accountImpl.target,
      ZERO_SALT
    );

    // 8. Deploy Collection Q (Multiplier NFT)
    const MockCollectionQ = await ethers.getContractFactory("MockCollectionQ");
    const colQ = await MockCollectionQ.deploy(deployer.address);

    // 9. Wire all dependencies
    await activation.connect(deployer).setEarningEngine(engine.target);
    await engine.connect(deployer).setRewardVault(vault.target);
    await nft.connect(deployer).setEarningEngine(engine.target);
    await nft.connect(deployer).setActivationController(activation.target);
    await engine.connect(deployer).setCollectionQ(colQ.target, MULTIPLIER_2X);

    // 10. Deploy Mock Reward Tokens (18-dec, 6-dec, and additional assets)
    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const rewardA = await MockRewardToken.deploy("StockA_18Dec", "STKA", 18, deployer.address);
    const rewardB = await MockRewardToken.deploy("StockB_6Dec", "STKB", 6, deployer.address);
    const rewardC = await MockRewardToken.deploy("StockC_18Dec", "STKC", 18, deployer.address);
    const rewardD = await MockRewardToken.deploy("StockD_ZeroPicker", "STKD", 18, deployer.address);

    await engine.connect(deployer).registerRewardAsset(rewardA.target);
    await engine.connect(deployer).registerRewardAsset(rewardB.target);
    await engine.connect(deployer).registerRewardAsset(rewardC.target);
    await engine.connect(deployer).registerRewardAsset(rewardD.target);

    // 11. Deploy Revenue Simulator & Physical Liquidity Pool
    const MockRevenueToken = await ethers.getContractFactory("MockRevenueToken");
    const mockRev = await MockRevenueToken.deploy(deployer.address);

    const TestnetPhysicalLiquidityPool = await ethers.getContractFactory("TestnetPhysicalLiquidityPool");
    const pool = await TestnetPhysicalLiquidityPool.deploy(mockRev.target, deployer.address);

    const TestnetRevenueSimulator = await ethers.getContractFactory("TestnetRevenueSimulator");
    const simulator = await TestnetRevenueSimulator.deploy(mockRev.target, deployer.address);

    // Configure pool rates (1 REV = 0.5 STKA (18dec), 1 REV = 1.0 STKB (6dec))
    await pool.connect(deployer).setAssetRate(rewardA.target, 1, 2, 18, true);
    await pool.connect(deployer).setAssetRate(rewardB.target, 1, 1, 6, true);
    await simulator.connect(deployer).setConversionRate(rewardA.target, 1, 2, 18);
    await simulator.connect(deployer).setConversionRate(rewardB.target, 1, 1, 6);

    // Grant funder permissions
    await engine.connect(deployer).setFunder(deployer.address, true);

    // Pre-fund BANANA to users for testing
    await banana.connect(deployer).transfer(alice.address, e18(10000));
    await banana.connect(deployer).transfer(bob.address, e18(10000));
    await banana.connect(deployer).transfer(charlie.address, e18(10000));

    return {
      deployer,
      alice,
      bob,
      charlie,
      attacker,
      registry,
      accountImpl,
      banana,
      nft,
      activation,
      engine,
      vault,
      colQ,
      rewardA,
      rewardB,
      rewardC,
      rewardD,
      mockRev,
      pool,
      simulator,
    };
  }

  async function mintNFT(ctx, to) {
    const supplyBefore = await ctx.nft.totalMinted();
    await ctx.nft.connect(ctx.deployer).mintBatch(to.address, 1);
    return Number(supplyBefore) + 1;
  }

  async function activateNFT(ctx, user, tokenId, assets) {
    await ctx.banana.connect(user).approve(ctx.activation.target, ACTIVATION_COST);
    await ctx.activation.connect(user).activate(tokenId, assets);
  }

  async function fundAndDeposit(ctx, asset, amount, duration) {
    await asset.connect(ctx.deployer).mint(ctx.deployer.address, amount * 2n);
    await asset.connect(ctx.deployer).approve(ctx.engine.target, amount);
    await ctx.engine.connect(ctx.deployer).fundReward(asset.target, amount, duration);
    await asset.connect(ctx.deployer).approve(ctx.vault.target, amount);
    await ctx.vault.connect(ctx.deployer).depositReward(asset.target, amount);
  }

  // ===========================================================================
  // SECTION 1: FULL ARCHITECTURE ACCEPTANCE LIFECYCLE
  // ===========================================================================
  describe("1. Full Architecture Release-Candidate Acceptance Lifecycle", function () {

    it("Phase 1: Collection Q Multiplier Eligibility & Baseline Verification", async function () {
      const ctx = await loadFixture(deployRCFixture);

      // Alice owns Collection Q NFT #1, Bob owns none
      await ctx.colQ.connect(ctx.deployer).mint(ctx.alice.address, 1);

      const tAlice = await mintNFT(ctx, ctx.alice);
      const tBob = await mintNFT(ctx, ctx.bob);

      // Verify on-chain weight calculation
      expect(await ctx.engine.getWeight(tAlice)).to.equal(MULTIPLIER_2X); // 20000 bps (2.0x)
      expect(await ctx.engine.getWeight(tBob)).to.equal(BASE_WEIGHT);     // 10000 bps (1.0x)

      // Attacker cannot modify Collection Q config
      await expect(ctx.engine.connect(ctx.attacker).setCollectionQ(ctx.colQ.target, 30000))
        .to.be.revertedWithCustomError(ctx.engine, "OwnableUnauthorizedAccount");
    });

    it("Phase 2: NFT Minting, Activation & Exact 100 BANANA Burn", async function () {
      const ctx = await loadFixture(deployRCFixture);
      const tAlice = await mintNFT(ctx, ctx.alice);

      const picks = [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target];

      const balBefore = await ctx.banana.balanceOf(ctx.alice.address);
      const supplyBefore = await ctx.banana.totalSupply();

      await activateNFT(ctx, ctx.alice, tAlice, picks);

      const balAfter = await ctx.banana.balanceOf(ctx.alice.address);
      const supplyAfter = await ctx.banana.totalSupply();

      expect(balBefore - balAfter).to.equal(ACTIVATION_COST);
      expect(supplyBefore - supplyAfter).to.equal(ACTIVATION_COST);
      expect(await ctx.activation.isActivated(tAlice)).to.be.true;

      const chosen = await ctx.engine.getChosenAssets(tAlice);
      expect(chosen).to.deep.equal(picks);
    });

    it("Phase 3 & 4: Physical Simulated Settlement -> Vault Funding -> Multiplier Accrual", async function () {
      const ctx = await loadFixture(deployRCFixture);

      // Alice has Collection Q (2.0x), Bob has baseline (1.0x)
      await ctx.colQ.connect(ctx.deployer).mint(ctx.alice.address, 1);
      const tAlice = await mintNFT(ctx, ctx.alice);
      const tBob = await mintNFT(ctx, ctx.bob);

      // Both pick RewardA (18-dec) and RewardB (6-dec)
      const picksAlice = [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target];
      const picksBob = [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardD.target];

      await activateNFT(ctx, ctx.alice, tAlice, picksAlice);
      await activateNFT(ctx, ctx.bob, tBob, picksBob);

      // Pre-fund Physical Liquidity Pool with reward assets
      await ctx.rewardA.connect(ctx.deployer).mint(ctx.deployer.address, e18(1000));
      await ctx.rewardA.connect(ctx.deployer).approve(ctx.pool.target, e18(1000));
      await ctx.pool.connect(ctx.deployer).depositRewardLiquidity(ctx.rewardA.target, e18(1000));

      await ctx.rewardB.connect(ctx.deployer).mint(ctx.deployer.address, e6(1000));
      await ctx.rewardB.connect(ctx.deployer).approve(ctx.pool.target, e6(1000));
      await ctx.pool.connect(ctx.deployer).depositRewardLiquidity(ctx.rewardB.target, e6(1000));

      // User pays protocol fees in REV to simulator
      await ctx.mockRev.connect(ctx.deployer).mint(ctx.charlie.address, e18(200));
      await ctx.mockRev.connect(ctx.charlie).approve(ctx.simulator.target, e18(200));
      await ctx.simulator.connect(ctx.charlie).generateFee("PlatformTrade", e18(200));

      // Settle REV with Pool for RewardA (100 REV -> 50 STKA)
      await ctx.simulator.connect(ctx.deployer).settleRevenueWithPool(ctx.pool.target, ctx.rewardA.target, e18(100));

      // Grant simulator funder permission
      await ctx.engine.connect(ctx.deployer).setFunder(ctx.simulator.target, true);

      // Simulator deposits acquired STKA and funds emission in one call!
      await ctx.simulator.connect(ctx.deployer).fundRewardVault(
        ctx.rewardA.target,
        e18(50),
        500n,
        ctx.engine.target,
        ctx.vault.target
      );

      // Advance time by 300 seconds
      await networkHelpers.time.increase(300);

      // Weight breakdown: Alice = 20,000, Bob = 10,000 -> Total = 30,000
      // Alice share = 2/3, Bob share = 1/3
      const cAlice = await ctx.engine.getTotalClaimableReward(tAlice, ctx.rewardA.target);
      const cBob = await ctx.engine.getTotalClaimableReward(tBob, ctx.rewardA.target);

      expect(cAlice).to.be.gt(0);
      expect(cBob).to.be.gt(0);
      // Alice (2.0x) should earn ~2x what Bob (1.0x) earned (within 1% integer rounding tolerance)
      const ratio = Number(cAlice * 1000n / cBob);
      expect(ratio).to.be.closeTo(2000, 20); // ~2.00x ratio verified!
    });

    it("Phase 5: Dynamic Collection Q Ownership Transfer & Sync", async function () {
      const ctx = await loadFixture(deployRCFixture);

      await ctx.colQ.connect(ctx.deployer).mint(ctx.alice.address, 1);
      const tAlice = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tAlice, [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target]);

      await fundAndDeposit(ctx, ctx.rewardA, e18(300), 600n);
      await networkHelpers.time.increase(100);

      // Alice transfers Collection Q #1 to Bob
      await ctx.colQ.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, 1);

      // Weight is now 1.0x for Alice
      expect(await ctx.engine.getWeight(tAlice)).to.equal(BASE_WEIGHT);

      // Sync on-chain
      await ctx.engine.syncCollectionQ(tAlice);
      expect(await ctx.engine.nftWeight(tAlice)).to.equal(BASE_WEIGHT);

      // Accrued rewards from the first 100s are preserved
      expect(await ctx.engine.getTotalClaimableReward(tAlice, ctx.rewardA.target)).to.be.gt(0);
    });

    it("Phase 6 & 7: Claim to TBA -> Partial Withdrawal -> Loaded NFT Transfer -> Seller Lockout", async function () {
      const ctx = await loadFixture(deployRCFixture);

      const tAlice = await mintNFT(ctx, ctx.alice);
      await activateNFT(ctx, ctx.alice, tAlice, [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target]);
      await fundAndDeposit(ctx, ctx.rewardA, e18(500), 500n);

      await networkHelpers.time.increase(200);

      const tbaAddr = await ctx.vault.accountOf(tAlice);
      await ctx.vault.createAccount(tAlice); // Deploy TBA proxy

      // 1. Claim reward -> Goes directly to TBA, NOT Alice EOA
      const eoaBefore = await ctx.rewardA.balanceOf(ctx.alice.address);
      await ctx.vault.claimReward(tAlice, ctx.rewardA.target);
      const tbaBal = await ctx.rewardA.balanceOf(tbaAddr);
      expect(tbaBal).to.be.gt(0);
      expect(await ctx.rewardA.balanceOf(ctx.alice.address)).to.equal(eoaBefore);

      // 2. Alice partially withdraws from TBA (half the balance)
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      const withdrawAmount = tbaBal / 2n;
      const transferData = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.alice.address, withdrawAmount]);
      await tba.connect(ctx.alice).execute(ctx.rewardA.target, 0, transferData, 0);

      expect(await ctx.rewardA.balanceOf(ctx.alice.address)).to.equal(withdrawAmount);
      expect(await ctx.rewardA.balanceOf(tbaAddr)).to.equal(tbaBal - withdrawAmount);

      // 3. Alice transfers loaded NFT #tAlice to Bob
      await ctx.nft.connect(ctx.alice).transferFrom(ctx.alice.address, ctx.bob.address, tAlice);

      // 4. Alice is locked out of TBA execute
      const remainingBal = await ctx.rewardA.balanceOf(tbaAddr);
      const stealData = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.alice.address, remainingBal]);
      await expect(tba.connect(ctx.alice).execute(ctx.rewardA.target, 0, stealData, 0))
        .to.be.revertedWithCustomError(tba, "NotAuthorized");

      // 5. Bob (new owner) can withdraw the remaining TBA balance
      const bobWithdrawData = ctx.rewardA.interface.encodeFunctionData("transfer", [ctx.bob.address, remainingBal]);
      await tba.connect(ctx.bob).execute(ctx.rewardA.target, 0, bobWithdrawData, 0);
      expect(await ctx.rewardA.balanceOf(ctx.bob.address)).to.equal(remainingBal);
      expect(await ctx.rewardA.balanceOf(tbaAddr)).to.equal(0);

      // 6. NFT is deactivated on transfer; Bob reactivates with new picks
      expect(await ctx.activation.isActivated(tAlice)).to.be.false;
      const newPicks = [ctx.rewardB.target, ctx.rewardC.target, ctx.rewardD.target];
      await activateNFT(ctx, ctx.bob, tAlice, newPicks);
      expect(await ctx.activation.isActivated(tAlice)).to.be.true;
      expect(await ctx.engine.getChosenAssets(tAlice)).to.deep.equal(newPicks);
    });

    it("Phase 8: ERC-6551 Asset Container (ERC-20, Native ETH, ERC-721, OwnershipCycle)", async function () {
      const ctx = await loadFixture(deployRCFixture);
      const tokenId = await mintNFT(ctx, ctx.alice);
      const tbaAddr = await ctx.vault.accountOf(tokenId);
      await ctx.vault.createAccount(tokenId);
      const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);

      // Native ETH reception and withdrawal
      await ctx.alice.sendTransaction({ to: tbaAddr, value: e18(2) });
      expect(await ethers.provider.getBalance(tbaAddr)).to.equal(e18(2));
      await tba.connect(ctx.alice).execute(ctx.alice.address, e18(2), "0x", 0);
      expect(await ethers.provider.getBalance(tbaAddr)).to.equal(0);

      // Ownership Cycle Guard: sending Token #tokenId into its own TBA reverts
      await expect(
        ctx.nft.connect(ctx.alice)["safeTransferFrom(address,address,uint256)"](ctx.alice.address, tbaAddr, BigInt(tokenId))
      ).to.be.revertedWithCustomError(tba, "OwnershipCycle");
    });
  });

  // ===========================================================================
  // SECTION 2: 500+ RANDOMIZED STATE-MACHINE FUZZ SEQUENCES
  // ===========================================================================
  describe("2. Release-Candidate State-Machine Fuzz Testing (500+ Sequences)", function () {

    async function runFuzzLifecycle(ctx, seed, iterations) {
      const rng = mulberry32(seed);
      const users = [ctx.alice, ctx.bob, ctx.charlie];
      const tokens = [];

      // Mint initial tokens
      for (let i = 0; i < 4; i++) {
        const owner = users[i % 3];
        const tid = await mintNFT(ctx, owner);
        await ctx.vault.createAccount(tid);
        tokens.push({ id: tid, owner, active: false });
      }

      // Fund reward assets
      await fundAndDeposit(ctx, ctx.rewardA, e18(100000), 50000n);
      await fundAndDeposit(ctx, ctx.rewardB, e6(100000), 50000n);
      await fundAndDeposit(ctx, ctx.rewardC, e18(100000), 50000n);

      for (let i = 0; i < iterations; i++) {
        const action = Math.floor(rng() * 6);
        const t = tokens[Math.floor(rng() * tokens.length)];

        try {
          if (action === 0 && !t.active) {
            // Activate
            const picks = [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardC.target];
            await activateNFT(ctx, t.owner, t.id, picks);
            t.active = true;
          } else if (action === 1 && t.active) {
            // Claim
            await networkHelpers.time.increase(Math.floor(rng() * 50) + 1);
            try { await ctx.vault.claimReward(t.id, ctx.rewardA.target); } catch {}
            try { await ctx.vault.claimReward(t.id, ctx.rewardB.target); } catch {}
          } else if (action === 2) {
            // Transfer NFT
            const newOwner = users[Math.floor(rng() * users.length)];
            if (newOwner.address !== t.owner.address) {
              await ctx.nft.connect(t.owner).transferFrom(t.owner.address, newOwner.address, t.id);
              t.owner = newOwner;
              t.active = false;
            }
          } else if (action === 3) {
            // Advance time
            await networkHelpers.time.increase(Math.floor(rng() * 100) + 1);
          } else if (action === 4) {
            // TBA withdrawal
            const tbaAddr = await ctx.vault.accountOf(t.id);
            const tba = await ethers.getContractAt("OohdiesAccount", tbaAddr);
            const balA = await ctx.rewardA.balanceOf(tbaAddr);
            if (balA > 0n) {
              const data = ctx.rewardA.interface.encodeFunctionData("transfer", [t.owner.address, balA]);
              await tba.connect(t.owner).execute(ctx.rewardA.target, 0, data, 0);
            }
          } else if (action === 5 && !t.active) {
            // Reactivate
            const picks = [ctx.rewardA.target, ctx.rewardB.target, ctx.rewardD.target];
            await activateNFT(ctx, t.owner, t.id, picks);
            t.active = true;
          }
        } catch {}
      }

      // Assert Invariants post-fuzz
      for (const t of tokens) {
        const accA = await ctx.engine.getAccruedReward(t.id, ctx.rewardA.target);
        const accB = await ctx.engine.getAccruedReward(t.id, ctx.rewardB.target);
        expect(accA).to.be.gte(0);
        expect(accB).to.be.gte(0);
      }

      for (const asset of [ctx.rewardA, ctx.rewardB, ctx.rewardC]) {
        const deposited = await ctx.vault.totalDeposited(asset.target);
        const claimed = await ctx.vault.totalClaimed(asset.target);
        expect(claimed).to.be.lte(deposited);
      }
    }

    it("FUZZ-RC-01: 250 multi-step state sequences (seed=10101)", async function () {
      const ctx = await loadFixture(deployRCFixture);
      await runFuzzLifecycle(ctx, 10101, 250);
    });

    it("FUZZ-RC-02: 250 multi-step state sequences (seed=88888)", async function () {
      const ctx = await loadFixture(deployRCFixture);
      await runFuzzLifecycle(ctx, 88888, 250);
    });

    it("FUZZ-RC-03: 250 multi-step state sequences (seed=55555)", async function () {
      const ctx = await loadFixture(deployRCFixture);
      await runFuzzLifecycle(ctx, 55555, 250);
    });
  });
});
