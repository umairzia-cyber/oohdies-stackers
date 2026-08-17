import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry } from "./helpers/erc6551.js";

// Each NFT earns only the assets it chose, and each asset's stream is split between the NFTs
// that chose it rather than every activated NFT.
describe("On-chain stock picks", function () {
  const COST = 1_000n * 10n ** 18n;
  const FUND = 1_000n * 10n ** 6n;
  const DURATION = 1_000n;

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

  async function deployPicksFixture() {
    const [owner, alice, bob, carol, funder] = await ethers.getSigners();

    const banana = await (await ethers.getContractFactory("BananaToken")).deploy(owner.address);
    const nft = await (await ethers.getContractFactory("OohdiesNFT")).deploy(owner.address);
    const activationController = await (await ethers.getContractFactory("ActivationController")).deploy(
      await nft.getAddress(), await banana.getAddress(), owner.address, COST
    );
    const engine = await (await ethers.getContractFactory("EarningEngine")).deploy(
      await activationController.getAddress(), await nft.getAddress(), owner.address
    );

    await installRegistry(networkHelpers);
    const accountImpl = await (await ethers.getContractFactory("OohdiesAccount")).deploy();
    const vault = await (await ethers.getContractFactory("RewardVault")).deploy(
      await nft.getAddress(), await engine.getAddress(), owner.address,
      CANONICAL_REGISTRY, await accountImpl.getAddress(), ZERO_SALT
    );

    await nft.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activationController.getAddress());
    await activationController.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());
    await engine.setFunder(funder.address, true);

    // All 6-decimal to keep the arithmetic below readable.
    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const tokens = {};
    for (const symbol of ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"]) {
      const t = await MockRewardToken.deploy(symbol, symbol, 6, owner.address);
      await engine.registerRewardAsset(await t.getAddress());
      tokens[symbol] = t;
    }
    const addr = async (s) => tokens[s].getAddress();

    for (const who of [alice, bob, carol]) {
      await banana.transfer(who.address, COST * 3n);
      await banana.connect(who).approve(await activationController.getAddress(), COST * 3n);
    }

    await nft.mint(alice.address); // #1
    await nft.mint(bob.address);   // #2
    await nft.mint(carol.address); // #3

    return { owner, alice, bob, carol, funder, banana, nft, activationController, engine, vault, tokens, addr };
  }

  async function fund(ctx, symbol) {
    const { engine, funder, tokens } = ctx;
    const token = tokens[symbol];
    await token.mint(funder.address, FUND);
    await token.connect(funder).approve(await engine.getAddress(), FUND);
    await engine.connect(funder).fundReward(await token.getAddress(), FUND, DURATION);
  }

  describe("Choosing", function () {
    it("records exactly the assets chosen, and nothing else", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, addr } = ctx;

      const picks = [await addr("AAA"), await addr("BBB"), await addr("CCC")];
      await activationController.connect(alice).activate(1n, picks);

      expect(await engine.getChosenAssets(1n)).to.deep.equal(picks);
      for (const s of ["AAA", "BBB", "CCC"]) {
        expect(await engine.hasChosenAsset(1n, await addr(s)), s).to.equal(true);
      }
      for (const s of ["DDD", "EEE", "FFF"]) {
        expect(await engine.hasChosenAsset(1n, await addr(s)), s).to.equal(false);
      }
    });

    it("counts each chosen asset's pickers", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, bob, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await activationController.connect(bob).activate(2n, [await addr("CCC"), await addr("DDD"), await addr("EEE")]);

      expect(await engine.activeCountForAsset(await addr("AAA"))).to.equal(1n); // alice only
      expect(await engine.activeCountForAsset(await addr("CCC"))).to.equal(2n); // both
      expect(await engine.activeCountForAsset(await addr("FFF"))).to.equal(0n); // nobody
    });
  });

  describe("Validation", function () {
    it("rejects the wrong number of picks", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, alice, addr } = ctx;

      await expect(
        activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB")])
      ).to.be.revertedWithCustomError(activationController, "WrongNumberOfPicks");
    });

    it("rejects duplicates", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, alice, addr } = ctx;

      await expect(
        activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("AAA"), await addr("BBB")])
      ).to.be.revertedWithCustomError(activationController, "DuplicatePick");
    });

    it("rejects an unregistered asset", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, alice, banana, addr } = ctx;

      await expect(
        activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await banana.getAddress()])
      ).to.be.revertedWithCustomError(activationController, "AssetNotSelectable");
    });

    it("does not burn $BANANA when the selection is invalid", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, alice, banana, addr } = ctx;

      const before = await banana.balanceOf(alice.address);
      await expect(
        activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("AAA"), await addr("BBB")])
      ).to.be.revertedWithCustomError(activationController, "DuplicatePick");

      expect(await banana.balanceOf(alice.address)).to.equal(before);
    });

    it("honours a changed requiredPicks", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, owner, alice, addr } = ctx;

      await activationController.connect(owner).setRequiredPicks(2n);
      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB")]);

      expect((await engine.getChosenAssets(1n)).length).to.equal(2);
    });
  });

  describe("Earning", function () {
    it("earns nothing from an asset it did not choose", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await fund(ctx, "DDD");

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      expect(await engine.getTotalClaimableReward(1n, await addr("DDD"))).to.equal(0n);
      expect(await engine.getTotalClaimableReward(1n, await addr("AAA"))).to.equal(0n); // AAA unfunded
    });

    it("a sole picker receives the entire stream", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, bob, addr } = ctx;

      // Bob's picks are disjoint from Alice's.
      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await activationController.connect(bob).activate(2n, [await addr("DDD"), await addr("EEE"), await addr("FFF")]);

      await fund(ctx, "AAA");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const rate = FUND / DURATION;
      const alicePaid = await engine.getTotalClaimableReward(1n, await addr("AAA"));

      // Roughly 100 seconds at the full rate, despite two NFTs being activated.
      expect(alicePaid).to.be.closeTo(100n * rate, 3n * rate);
      expect(await engine.getTotalClaimableReward(2n, await addr("AAA"))).to.equal(0n);
    });

    it("two pickers split a stream evenly", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, bob, addr } = ctx;

      // Both choose CCC, nothing else overlaps.
      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await activationController.connect(bob).activate(2n, [await addr("CCC"), await addr("DDD"), await addr("EEE")]);

      await fund(ctx, "CCC");
      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const aliceShare = await engine.getTotalClaimableReward(1n, await addr("CCC"));
      const bobShare = await engine.getTotalClaimableReward(2n, await addr("CCC"));
      const rate = FUND / DURATION;

      expect(aliceShare).to.be.closeTo(bobShare, rate);
      expect(aliceShare + bobShare).to.be.closeTo(100n * rate, 4n * rate);
    });

    it("an asset nobody picked does not advance, so its emission is held not lost", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await fund(ctx, "FFF"); // nobody chose FFF

      await networkHelpers.time.increase(200);
      await networkHelpers.mine();

      expect(await engine.rewardPerToken(await addr("FFF"))).to.equal(0n);

      // Carol picks it up and earns from now, not retroactively.
      await activationController.connect(ctx.carol).activate(3n, [await addr("FFF"), await addr("DDD"), await addr("EEE")]);
      expect(await engine.activeCountForAsset(await addr("FFF"))).to.equal(1n);
      expect(await engine.getTotalClaimableReward(3n, await addr("FFF"))).to.equal(0n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();
      expect(await engine.getTotalClaimableReward(3n, await addr("FFF"))).to.be.gt(0n);
    });
  });

  describe("Releasing", function () {
    it("a transfer releases the picks and re-divides the stream", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, nft, alice, bob, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await activationController.connect(bob).activate(2n, [await addr("CCC"), await addr("DDD"), await addr("EEE")]);
      expect(await engine.activeCountForAsset(await addr("CCC"))).to.equal(2n);

      await fund(ctx, "CCC");
      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      const bankedBefore = await engine.getTotalClaimableReward(1n, await addr("CCC"));
      expect(bankedBefore).to.be.gt(0n);

      await nft.connect(alice).transferFrom(alice.address, ctx.carol.address, 1n);

      expect(await engine.getChosenAssets(1n)).to.deep.equal([]);
      expect(await engine.activeCountForAsset(await addr("CCC"))).to.equal(1n);
      expect(await engine.hasChosenAsset(1n, await addr("CCC"))).to.equal(false);

      // Already-earned rewards stay with the tokenId.
      const bankedAfter = await engine.getTotalClaimableReward(1n, await addr("CCC"));
      expect(bankedAfter).to.be.gte(bankedBefore);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();
      expect(await engine.getTotalClaimableReward(1n, await addr("CCC"))).to.equal(bankedAfter);
    });

    it("re-activating can choose a different set", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, nft, alice, carol, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await nft.connect(alice).transferFrom(alice.address, carol.address, 1n);

      const newPicks = [await addr("DDD"), await addr("EEE"), await addr("FFF")];
      await activationController.connect(carol).activate(1n, newPicks);

      expect(await engine.getChosenAssets(1n)).to.deep.equal(newPicks);
      expect(await engine.activeCountForAsset(await addr("AAA"))).to.equal(0n);
      expect(await engine.activeCountForAsset(await addr("DDD"))).to.equal(1n);
    });

    it("releaseIfInactive repairs an NFT whose picks were never released", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, nft, owner, alice, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);

      // Point the NFT at a non-engine address so the transfer hook cannot run.
      await nft.connect(owner).setEarningEngine(await ctx.banana.getAddress());
      await nft.connect(alice).transferFrom(alice.address, ctx.carol.address, 1n);

      expect(await activationController.isActivated(1n)).to.equal(false);
      expect(await engine.activeCountForAsset(await addr("AAA"))).to.equal(1n);

      await engine.connect(ctx.bob).releaseIfInactive(1n);

      expect(await engine.activeCountForAsset(await addr("AAA"))).to.equal(0n);
      expect(await engine.getChosenAssets(1n)).to.deep.equal([]);
    });

    it("releaseIfInactive refuses while the NFT is still active", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, alice, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);

      await expect(engine.releaseIfInactive(1n)).to.be.revertedWithCustomError(engine, "StillActivated");
    });
  });

  describe("Claiming", function () {
    it("pays only the chosen assets into the NFT's wallet", async function () {
      const ctx = await loadFixture(deployPicksFixture);
      const { activationController, engine, vault, alice, funder, tokens, addr } = ctx;

      await activationController.connect(alice).activate(1n, [await addr("AAA"), await addr("BBB"), await addr("CCC")]);
      await fund(ctx, "AAA");

      const aaa = tokens["AAA"];
      await aaa.mint(funder.address, FUND);
      await aaa.connect(funder).approve(await vault.getAddress(), FUND);
      await vault.connect(funder).depositReward(await addr("AAA"), FUND);

      await networkHelpers.time.increase(100);
      await networkHelpers.mine();

      const wallet = await vault.accountOf(1n);
      await vault.claimReward(1n, await addr("AAA"));
      expect(await aaa.balanceOf(wallet)).to.be.gt(0n);

      await expect(
        vault.claimReward(1n, await addr("DDD"))
      ).to.be.revertedWithCustomError(vault, "NoRewardToClaim");
    });
  });
});
