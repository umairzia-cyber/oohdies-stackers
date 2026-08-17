import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry } from "./helpers/erc6551.js";

describe("Collection Q Holder Reward Multiplier & Protocol Invariants", function () {
  const COST = 100n * 10n ** 18n;
  const FUND_6 = 1_000_000n * 10n ** 6n;   // 1,000,000 USDG (6 dec)
  const FUND_18 = 1_000_000n * 10n ** 18n; // 1,000,000 AAPLx (18 dec)
  const DURATION = 1_000n;                 // 1,000 seconds
  const MULTIPLIER_2X = 20000n;            // 2.0x (20,000 bps)
  const BASE_WEIGHT = 10000n;              // 1.0x (10,000 bps)

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

  async function deployFixture() {
    const [owner, alice, bob, carol, david, funder, stranger] = await ethers.getSigners();

    const banana = await (await ethers.getContractFactory("BananaToken")).deploy(owner.address);
    const nft = await (await ethers.getContractFactory("OohdiesNFT")).deploy(owner.address);
    const collectionQ = await (await ethers.getContractFactory("MockCollectionQ")).deploy(owner.address);

    const activationController = await (await ethers.getContractFactory("ActivationController")).deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      owner.address,
      COST
    );

    const engine = await (await ethers.getContractFactory("EarningEngine")).deploy(
      await activationController.getAddress(),
      await nft.getAddress(),
      owner.address
    );

    await installRegistry(networkHelpers);
    const accountImpl = await (await ethers.getContractFactory("OohdiesAccount")).deploy();
    const vault = await (await ethers.getContractFactory("RewardVault")).deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      owner.address,
      CANONICAL_REGISTRY,
      await accountImpl.getAddress(),
      ZERO_SALT
    );

    // Protocol wiring
    await nft.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activationController.getAddress());
    await activationController.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());
    await engine.setFunder(funder.address, true);

    // Configure Collection Q on EarningEngine with 2.0x multiplier
    await engine.setCollectionQ(await collectionQ.getAddress(), MULTIPLIER_2X);

    // Deploy 12 mock reward tokens (USDG = 6 decimals, S2..S12 = 18 decimals)
    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const tokens = {};
    const stockSymbols = ["USDG", "AAPLx", "TSLAx", "NVDAx", "MSFTx", "AMZNx", "GOOGLx", "METAx", "PLTRx", "AMDx", "GMEx", "SPCXx"];

    for (let i = 0; i < stockSymbols.length; i++) {
      const sym = stockSymbols[i];
      const dec = i === 0 ? 6 : 18;
      const t = await MockRewardToken.deploy(sym, sym, dec, owner.address);
      await engine.registerRewardAsset(await t.getAddress());
      tokens[sym] = t;
    }

    const addr = async (sym) => tokens[sym].getAddress();

    // Fund BANANA to test wallets
    for (const who of [alice, bob, carol, david]) {
      await banana.transfer(who.address, COST * 10n);
      await banana.connect(who).approve(await activationController.getAddress(), COST * 10n);
    }

    // Mint Oohdies NFTs: Alice (#1, #2), Bob (#3), Carol (#4), David (#5)
    await nft.mint(alice.address); // #1
    await nft.mint(alice.address); // #2
    await nft.mint(bob.address);   // #3
    await nft.mint(carol.address); // #4
    await nft.mint(david.address); // #5

    return {
      owner,
      alice,
      bob,
      carol,
      david,
      funder,
      stranger,
      banana,
      nft,
      collectionQ,
      activationController,
      engine,
      vault,
      tokens,
      addr,
      stockSymbols
    };
  }

  async function fundStream(ctx, sym, amount = null) {
    const { engine, vault, funder, tokens, addr } = ctx;
    const token = tokens[sym];
    const is6 = sym === "USDG";
    const fundAmt = amount !== null ? amount : (is6 ? FUND_6 : FUND_18);
    const tokenAddr = await addr(sym);

    await token.mint(funder.address, fundAmt * 2n);
    await token.connect(funder).approve(await engine.getAddress(), fundAmt);
    await engine.connect(funder).fundReward(tokenAddr, fundAmt, DURATION);

    // Also fund vault for claiming
    await token.connect(funder).approve(await vault.getAddress(), fundAmt);
    await vault.connect(funder).depositReward(tokenAddr, fundAmt);
  }

  describe("Section 30: Dedicated Regression Test — Stock Selection Isolation", function () {
    it("should never accrue unselected stocks (12 configured, 3 selected)", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, vault, alice, addr, stockSymbols } = ctx;

      // Alice selects exactly 3 stocks: USDG, AAPLx, TSLAx
      const picks = [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")];
      await activationController.connect(alice).activate(1n, picks);

      // Fund ALL 12 stocks
      for (const sym of stockSymbols) {
        await fundStream(ctx, sym);
      }

      // Advance 100 seconds
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      // Assert: selected stocks have claimable > 0
      expect(await engine.getTotalClaimableReward(1n, await addr("USDG"))).to.be.gt(0n);
      expect(await engine.getTotalClaimableReward(1n, await addr("AAPLx"))).to.be.gt(0n);
      expect(await engine.getTotalClaimableReward(1n, await addr("TSLAx"))).to.be.gt(0n);

      // Assert: unselected 9 stocks have STRICTLY 0 claimable
      for (let i = 3; i < stockSymbols.length; i++) {
        const unselectedSym = stockSymbols[i];
        const claimable = await engine.getTotalClaimableReward(1n, await addr(unselectedSym));
        expect(claimable, `Unselected stock ${unselectedSym} must accrue exactly 0`).to.equal(0n);
      }

      // Claim all 3 selected stocks
      await vault.claimReward(1n, await addr("USDG"));
      await vault.claimReward(1n, await addr("AAPLx"));
      await vault.claimReward(1n, await addr("TSLAx"));

      // Verify unselected stocks still have 0 hidden liability
      for (let i = 3; i < stockSymbols.length; i++) {
        const unselectedSym = stockSymbols[i];
        expect(await engine.getTotalClaimableReward(1n, await addr(unselectedSym))).to.equal(0n);
        expect(await engine.getAccruedReward(1n, await addr(unselectedSym))).to.equal(0n);
      }
    });
  });

  describe("Section 31: Collection Q Multiplier Tests (Tests 1 to 25)", function () {
    it("Test 1 — no Q: OOHDIES owner without Q receives base rewards", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, bob, addr } = ctx;

      // Bob has no Q
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      expect(await engine.getWeight(3n)).to.equal(BASE_WEIGHT);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const rate = FUND_18 / DURATION;
      const earned = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));
      expect(earned).to.be.closeTo(100n * rate, 5n * rate);
    });

    it("Test 2 — Q owned: OOHDIES owner with Q receives bonus rewards (2x weight against base holder)", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, alice, bob, addr } = ctx;

      // Alice owns Q #1; Bob owns no Q
      await collectionQ.mint(alice.address, 1n);

      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      expect(await engine.getWeight(1n)).to.equal(MULTIPLIER_2X);
      expect(await engine.getWeight(3n)).to.equal(BASE_WEIGHT);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const aliceShare = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const bobShare = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));

      // Alice (2x weight) gets 2/3, Bob (1x weight) gets 1/3
      expect(aliceShare).to.be.closeTo(bobShare * 2n, bobShare / 50n);
    });

    it("Test 3 — one Q vs multiple Q: 1 Q and 10 Q produce the same bonus", async function () {
      const ctx = await loadFixture(deployFixture);
      const { engine, collectionQ, alice, bob } = ctx;

      // Alice has 1 Q
      await collectionQ.mint(alice.address, 1n);
      // Bob has 10 Qs
      for (let i = 10; i < 20; i++) {
        await collectionQ.mint(bob.address, BigInt(i));
      }

      expect(await engine.getWeight(1n)).to.equal(MULTIPLIER_2X);
      expect(await engine.getWeight(3n)).to.equal(MULTIPLIER_2X);
    });

    it("Test 4 — different wallets: Q ownership for Wallet A does not bonus Wallet B", async function () {
      const ctx = await loadFixture(deployFixture);
      const { engine, collectionQ, alice, bob } = ctx;

      await collectionQ.mint(alice.address, 1n);

      expect(await engine.getWeight(1n)).to.equal(MULTIPLIER_2X); // Alice
      expect(await engine.getWeight(3n)).to.equal(BASE_WEIGHT);   // Bob (no Q)
    });

    it("Test 5 — multiple OOHDIES: Bonus is correctly applied to each eligible OOHDIES NFT independently", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, alice, bob, addr } = ctx;

      // Alice owns Oohdies #1 and #2, and owns Q #1
      await collectionQ.mint(alice.address, 1n);

      // Alice activates #1 and #2; Bob (no Q) activates #3
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(alice).activate(2n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      expect(await engine.getWeight(1n)).to.equal(MULTIPLIER_2X);
      expect(await engine.getWeight(2n)).to.equal(MULTIPLIER_2X);
      expect(await engine.getWeight(3n)).to.equal(BASE_WEIGHT);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const share1 = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const share2 = await engine.getTotalClaimableReward(2n, await addr("AAPLx"));
      const share3 = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));

      // #1 and #2 (Alice) earn equally at 2x weight (2/5 each); Bob earns at 1x weight (1/5)
      expect(share1).to.be.closeTo(share2, share1 / 100n);
      expect(share1).to.be.closeTo(share3 * 2n, share1 / 50n);
    });

    it("Test 6 & 8 — Q acquired after accrual begins: No retroactive bonus (Period 1 base + Period 2 bonus)", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, alice, bob, addr } = ctx;

      // Both Alice and Bob activate with NO Q (both at 1x weight)
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");

      // Period 1: 100s where neither owns Q (50/50 split)
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const p1Alice = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const p1Bob = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));
      expect(p1Alice).to.be.closeTo(p1Bob, p1Alice / 50n); // 50/50 in Period 1

      // Alice receives Q #1 and syncs
      await collectionQ.mint(alice.address, 1n);
      await engine.connect(alice).syncCollectionQ(1n);

      // Period 2: 100s where Alice has 2x weight, Bob has 1x weight (2/3 vs 1/3 split)
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const totalAlice = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const totalBob = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));

      const p2Alice = totalAlice - p1Alice;
      const p2Bob = totalBob - p1Bob;

      expect(p2Alice).to.be.closeTo(p2Bob * 2n, p2Alice / 50n);
    });

    it("Test 9 & 10 — Q lost after bonus accrual: Previously accrued bonus remains intact and claimable", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, vault, collectionQ, alice, bob, addr } = ctx;

      // Alice starts with Q #1 (2x weight); Bob has no Q (1x weight)
      await collectionQ.mint(alice.address, 1n);
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");

      // Period 1 (100s): Alice gets 2/3, Bob gets 1/3
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const p1Alice = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      expect(p1Alice).to.be.gt(0n);

      // Alice transfers Q #1 away to Carol
      await collectionQ.connect(alice).transferFrom(alice.address, ctx.carol.address, 1n);
      await engine.connect(alice).syncCollectionQ(1n);

      // Period 2 (100s): Both at 1x weight (50/50)
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      // Alice claims after losing Q — she successfully claims all accrued rewards!
      const totalBeforeClaim = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      expect(totalBeforeClaim).to.be.gt(p1Alice);

      const wallet = await vault.accountOf(1n);
      await vault.claimReward(1n, await addr("AAPLx"));

      const aapl = ctx.tokens["AAPLx"];
      expect(await aapl.balanceOf(wallet)).to.be.gte(totalBeforeClaim);
    });

    it("Test 11 & 25 — Q acquired/transferred immediately before claim: No retroactive modification", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, vault, collectionQ, alice, bob, addr } = ctx;

      // Alice and Bob both start with NO Q
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");

      // Accrue 100 seconds at base rate
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      // Right before claim, Alice mints Q #1
      await collectionQ.mint(alice.address, 1n);

      // Claiming immediately triggers syncCollectionQ, settling the past 100s at 1x weight
      await vault.claimReward(1n, await addr("AAPLx"));
      await vault.claimReward(3n, await addr("AAPLx"));

      const walletAlice = await vault.accountOf(1n);
      const walletBob = await vault.accountOf(3n);
      const aapl = ctx.tokens["AAPLx"];

      const balAlice = await aapl.balanceOf(walletAlice);
      const balBob = await aapl.balanceOf(walletBob);

      // Since past 100s was earned while Alice did NOT have Q, payouts are 50/50 (no retroactive bonus)
      expect(balAlice).to.be.closeTo(balBob, balAlice / 50n);
    });

    it("Test 7 — OOHDIES transfer: Bonus eligibility follows the new owner correctly", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, nft, alice, bob, addr } = ctx;

      // Alice owns Q #1; Bob does NOT own Q
      await collectionQ.mint(alice.address, 1n);

      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      expect(await engine.getWeight(1n)).to.equal(MULTIPLIER_2X);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      // Alice transfers Oohdie #1 to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);

      // Token #1 is deactivated on transfer
      expect(await activationController.isActivated(1n)).to.equal(false);
      expect(await engine.getChosenAssets(1n)).to.deep.equal([]);

      // When Bob reactivates #1, its weight is evaluated against Bob (no Q -> 1x)
      await activationController.connect(bob).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      expect(await engine.getWeight(1n)).to.equal(BASE_WEIGHT);
    });

    it("Test 12 & 13 — Multi-Asset Precision: Correct bonus on USDG (6 decimals) and AAPLx (18 decimals)", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, alice, bob, addr } = ctx;

      await collectionQ.mint(alice.address, 1n);

      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "USDG");
      await fundStream(ctx, "AAPLx");

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const usdgAlice = await engine.getTotalClaimableReward(1n, await addr("USDG"));
      const usdgBob = await engine.getTotalClaimableReward(3n, await addr("USDG"));
      expect(usdgAlice).to.be.closeTo(usdgBob * 2n, usdgAlice / 50n);

      const aaplAlice = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const aaplBob = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));
      expect(aaplAlice).to.be.closeTo(aaplBob * 2n, aaplAlice / 50n);
    });

    it("Test 14 — Claim isolation: USDG claim does not affect AAPLx", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, vault, collectionQ, alice, addr } = ctx;

      await collectionQ.mint(alice.address, 1n);
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "USDG");
      await fundStream(ctx, "AAPLx");

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const aaplBefore = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      expect(aaplBefore).to.be.gt(0n);

      // Claim USDG only
      await vault.claimReward(1n, await addr("USDG"));

      const aaplAfter = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      expect(aaplAfter).to.be.gte(aaplBefore);
    });

    it("Test 15 & 16 — NFT & TBA Isolation: Claims route strictly to each NFT's own TBA", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, vault, collectionQ, alice, bob, stranger, addr } = ctx;

      await collectionQ.mint(alice.address, 1n);
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const wallet1 = await vault.accountOf(1n);
      const wallet3 = await vault.accountOf(3n);
      expect(wallet1).to.not.equal(wallet3);

      // Stranger triggers claim on #1 and #3
      await vault.connect(stranger).claimReward(1n, await addr("AAPLx"));
      await vault.connect(stranger).claimReward(3n, await addr("AAPLx"));

      const aapl = ctx.tokens["AAPLx"];
      expect(await aapl.balanceOf(wallet1)).to.be.gt(0n);
      expect(await aapl.balanceOf(wallet3)).to.be.gt(0n);
      expect(await aapl.balanceOf(stranger.address)).to.equal(0n);
    });

    it("Test 21 — Double Multiplier Prevention: Bonus is applied exactly once", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, collectionQ, alice, bob, addr } = ctx;

      await collectionQ.mint(alice.address, 1n);
      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const aliceClaimable = await engine.getTotalClaimableReward(1n, await addr("AAPLx"));
      const bobClaimable = await engine.getTotalClaimableReward(3n, await addr("AAPLx"));

      // Exactly 2x (Alice: 2/3, Bob: 1/3), not 4x or 3x
      const ratio = (aliceClaimable * 1000n) / bobClaimable;
      expect(ratio).to.be.closeTo(2000n, 50n);
    });

    it("Test 23 — Vault Accounting & Conservation of Funds: Sum of claims <= total funded", async function () {
      const ctx = await loadFixture(deployFixture);
      const { activationController, engine, vault, collectionQ, alice, bob, carol, addr } = ctx;

      await collectionQ.mint(alice.address, 1n);
      await collectionQ.mint(carol.address, 2n);

      await activationController.connect(alice).activate(1n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(bob).activate(3n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);
      await activationController.connect(carol).activate(4n, [await addr("USDG"), await addr("AAPLx"), await addr("TSLAx")]);

      await fundStream(ctx, "AAPLx");

      // Advance past duration
      await networkHelpers.time.increase(1500);
      await networkHelpers.mine();

      await vault.claimReward(1n, await addr("AAPLx"));
      await vault.claimReward(3n, await addr("AAPLx"));
      await vault.claimReward(4n, await addr("AAPLx"));

      const wallet1 = await vault.accountOf(1n);
      const wallet3 = await vault.accountOf(3n);
      const wallet4 = await vault.accountOf(4n);
      const aapl = ctx.tokens["AAPLx"];

      const totalPaid = (await aapl.balanceOf(wallet1)) + (await aapl.balanceOf(wallet3)) + (await aapl.balanceOf(wallet4));
      expect(totalPaid).to.be.lte(FUND_18);
      expect(totalPaid).to.be.closeTo(FUND_18, 10n); // Distributed full emission
    });

    it("Test 26 & 27 — Configuration Access Control: Only owner can setCollectionQ and multiplier >= BASE_WEIGHT", async function () {
      const ctx = await loadFixture(deployFixture);
      const { engine, collectionQ, alice } = ctx;

      await expect(
        engine.connect(alice).setCollectionQ(await collectionQ.getAddress(), MULTIPLIER_2X)
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");

      await expect(
        engine.setCollectionQ(await collectionQ.getAddress(), 5000n) // < 10000 bps
      ).to.be.revertedWithCustomError(engine, "InvalidMultiplier");
    });
  });
});
