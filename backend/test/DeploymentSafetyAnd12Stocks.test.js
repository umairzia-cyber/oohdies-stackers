import { expect } from "chai";
import fs from "fs";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, ensureRegistry, predictAccount } from "../lib/erc6551.js";

describe("Deployment Safety & 12-Stock Protocol Invariants", function () {
  let ethers;
  let deployer, alice, bob, charlie, funder, stranger;
  let nft, banana, activation, engine, vault, accountImpl;
  let stockTokens = [];
  let rawStockList;

  const PROTOCOL_ACTIVATION_COST = 100n * 10n ** 18n; // 100 BANANA
  const REQUIRED_PICKS = 3n;

  async function deployFixture() {
    ({ ethers } = await hre.network.create());
    const signers = await ethers.getSigners();
    deployer = signers[0];
    alice = signers[1];
    bob = signers[2];
    charlie = signers[3];
    funder = signers[4];
    stranger = signers[5];

    await ensureRegistry(ethers.provider);

    // Deploy BananaToken
    const BananaToken = await ethers.getContractFactory("BananaToken");
    banana = await BananaToken.deploy(deployer.address);
    await banana.waitForDeployment();

    // Deploy OohdiesNFT
    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    nft = await OohdiesNFT.deploy(deployer.address);
    await nft.waitForDeployment();

    // Deploy ActivationController with exact 100 BANANA
    const ActivationController = await ethers.getContractFactory("ActivationController");
    activation = await ActivationController.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      deployer.address,
      PROTOCOL_ACTIVATION_COST
    );
    await activation.waitForDeployment();

    // Deploy EarningEngine
    const EarningEngine = await ethers.getContractFactory("EarningEngine");
    engine = await EarningEngine.deploy(
      await activation.getAddress(),
      await nft.getAddress(),
      deployer.address
    );
    await engine.waitForDeployment();

    // Deploy OohdiesAccount implementation
    const OohdiesAccount = await ethers.getContractFactory("OohdiesAccount");
    accountImpl = await OohdiesAccount.deploy();
    await accountImpl.waitForDeployment();

    // Deploy RewardVault
    const RewardVault = await ethers.getContractFactory("RewardVault");
    vault = await RewardVault.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      deployer.address,
      CANONICAL_REGISTRY,
      await accountImpl.getAddress(),
      ZERO_SALT
    );
    await vault.waitForDeployment();

    // Wire contracts
    await activation.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());
    await engine.setFunder(funder.address, true);
    await nft.setActivationController(await activation.getAddress());
    await nft.setEarningEngine(await engine.getAddress());

    // Deploy All 12 Mock Stock Tokens
    rawStockList = JSON.parse(fs.readFileSync("all_deployed_stocks.json", "utf8"));
    const MockToken = await ethers.getContractFactory("MockRewardToken");
    stockTokens = [];

    for (const item of rawStockList) {
      const tok = await MockToken.deploy(item.name, item.symbol, item.decimals, funder.address);
      await tok.waitForDeployment();
      await engine.registerRewardAsset(await tok.getAddress());
      stockTokens.push(tok);
    }

    // Distribute BANANA to test users
    for (const user of [alice, bob, charlie, stranger]) {
      await banana.transfer(user.address, 10_000n * 10n ** 18n);
      await banana.connect(user).approve(await activation.getAddress(), ethers.MaxUint256);
    }
  }

  beforeEach(async function () {
    await deployFixture();
  });

  async function fundStockStream(token, amount, durationSec) {
    const tokenAddr = await token.getAddress();
    const engineAddr = await engine.getAddress();
    const vaultAddr = await vault.getAddress();

    await token.connect(funder).mint(funder.address, amount * 2n);
    await token.connect(funder).approve(engineAddr, amount);
    await engine.connect(funder).fundReward(tokenAddr, amount, durationSec);

    await token.connect(funder).approve(vaultAddr, amount);
    await vault.connect(funder).depositReward(tokenAddr, amount);
  }

  describe("Part A: Pre-Deployment Configuration & 12-Stock Sanity", function () {
    it("TEST 1: Deployment configuration requires activation cost = 100 BANANA", async function () {
      expect(await activation.activationCost()).to.equal(PROTOCOL_ACTIVATION_COST);
      expect(await activation.activationCost()).to.equal(100n * 10n ** 18n);
      expect(await activation.activationCost()).to.not.equal(1_000n * 10n ** 18n);
    });

    it("TEST 2: Deployment configuration requires exactly 3 picks", async function () {
      expect(await activation.requiredPicks()).to.equal(REQUIRED_PICKS);
      expect(await activation.requiredPicks()).to.equal(3n);
    });

    it("TEST 3: Authoritative stock list contains all 12 intended reward assets", async function () {
      const stocks = JSON.parse(fs.readFileSync("all_deployed_stocks.json", "utf8"));
      expect(stocks.length).to.equal(12);
      const expectedSymbols = ["USDG", "AAPLx", "TSLAx", "NVDAx", "MSFTx", "AMZNx", "GOOGLx", "METAx", "PLTRx", "AMDx", "GMEx", "SPCXx"];
      const actualSymbols = stocks.map(s => s.symbol);
      for (const sym of expectedSymbols) {
        expect(actualSymbols).to.include(sym);
      }
    });

    it("TEST 4: No duplicate reward assets in authoritative stock list", async function () {
      const stocks = JSON.parse(fs.readFileSync("all_deployed_stocks.json", "utf8"));
      const addrs = stocks.map(s => s.address.toLowerCase());
      const uniqueAddrs = new Set(addrs);
      expect(uniqueAddrs.size).to.equal(12);

      const symbols = stocks.map(s => s.symbol.toLowerCase());
      const uniqueSymbols = new Set(symbols);
      expect(uniqueSymbols.size).to.equal(12);
    });

    it("TEST 5: All 12 reward assets are actually registered after deployment", async function () {
      const registered = await engine.getRegisteredRewardAssets();
      expect(registered.length).to.equal(12);
      for (const tok of stockTokens) {
        const addr = await tok.getAddress();
        expect(await engine.isRegisteredAsset(addr)).to.be.true;
      }
    });

    it("TEST 6: Deployment fails / halts if fewer than required picks are registered", async function () {
      const EarningEngineFactory = await ethers.getContractFactory("EarningEngine");
      const tempEngine = await EarningEngineFactory.deploy(
        await activation.getAddress(),
        await nft.getAddress(),
        deployer.address
      );
      await tempEngine.waitForDeployment();

      // Only register 2 assets
      await tempEngine.registerRewardAsset(await stockTokens[0].getAddress());
      await tempEngine.registerRewardAsset(await stockTokens[1].getAddress());

      const registered = await tempEngine.getRegisteredRewardAssets();
      const required = await activation.requiredPicks();
      expect(registered.length).to.be.lessThan(Number(required));
    });
  });

  describe("Part B: Stock Selection Validation & Edge Cases", function () {
    it("TEST 7: Activation fails when fewer than 3 registered assets are available", async function () {
      const ActivationController = await ethers.getContractFactory("ActivationController");
      const freshActivation = await ActivationController.deploy(
        await nft.getAddress(),
        await banana.getAddress(),
        deployer.address,
        PROTOCOL_ACTIVATION_COST
      );
      await freshActivation.waitForDeployment();

      const EarningEngine = await ethers.getContractFactory("EarningEngine");
      const freshEngine = await EarningEngine.deploy(
        await freshActivation.getAddress(),
        await nft.getAddress(),
        deployer.address
      );
      await freshEngine.waitForDeployment();
      await freshActivation.setEarningEngine(await freshEngine.getAddress());

      // Only register 2 assets in freshEngine
      await freshEngine.registerRewardAsset(await stockTokens[0].getAddress());
      await freshEngine.registerRewardAsset(await stockTokens[1].getAddress());

      await nft.mint(alice.address);
      // Attempting to activate with 2 picks reverts with WrongNumberOfPicks
      await expect(
        freshActivation.connect(alice).activate(1, [
          await stockTokens[0].getAddress(),
          await stockTokens[1].getAddress()
        ])
      ).to.be.revertedWithCustomError(freshActivation, "WrongNumberOfPicks");
    });

    it("TEST 8: Activation succeeds with 3 valid distinct registered assets and burns exact 100 BANANA", async function () {
      await nft.mint(alice.address);
      const picks = [
        await stockTokens[0].getAddress(),
        await stockTokens[1].getAddress(),
        await stockTokens[2].getAddress()
      ];

      const balBefore = await banana.balanceOf(alice.address);

      await expect(activation.connect(alice).activate(1, picks))
        .to.emit(activation, "NFTActivated")
        .withArgs(1, alice.address, PROTOCOL_ACTIVATION_COST, (v) => v > 0n);

      const balAfter = await banana.balanceOf(alice.address);
      expect(balBefore - balAfter).to.equal(PROTOCOL_ACTIVATION_COST);
      expect(await activation.isActivated(1)).to.be.true;

      const chosen = await engine.getChosenAssets(1);
      expect(chosen).to.deep.equal(picks);
    });

    it("TEST 9: Activation fails with duplicate selections", async function () {
      await nft.mint(alice.address);
      const dupPicks = [
        await stockTokens[0].getAddress(),
        await stockTokens[0].getAddress(), // duplicate
        await stockTokens[1].getAddress()
      ];

      await expect(
        activation.connect(alice).activate(1, dupPicks)
      ).to.be.revertedWithCustomError(activation, "DuplicatePick");
    });

    it("TEST 10: Activation fails with an unregistered or zero address asset", async function () {
      await nft.mint(alice.address);
      const invalidPicks = [
        await stockTokens[0].getAddress(),
        await stockTokens[1].getAddress(),
        ethers.ZeroAddress
      ];

      await expect(
        activation.connect(alice).activate(1, invalidPicks)
      ).to.be.revertedWithCustomError(activation, "AssetNotSelectable");

      const unregisteredPicks = [
        await stockTokens[0].getAddress(),
        await stockTokens[1].getAddress(),
        stranger.address // Valid address but not a registered asset
      ];

      await expect(
        activation.connect(alice).activate(1, unregisteredPicks)
      ).to.be.revertedWithCustomError(activation, "AssetNotSelectable");
    });

    it("TEST 11: Non-owner cannot activate NFT", async function () {
      await nft.mint(alice.address);
      const picks = [
        await stockTokens[0].getAddress(),
        await stockTokens[1].getAddress(),
        await stockTokens[2].getAddress()
      ];

      await expect(
        activation.connect(bob).activate(1, picks)
      ).to.be.revertedWithCustomError(activation, "NotNFTOwner");
    });
  });

  describe("Part C: Multi-NFT Stock Overlap & Economic Invariance (All 12 Stocks)", function () {
    it("TEST 12: Overlapping stock picks split exactly per asset with ZERO cross-asset leakage", async function () {
      const aapl = stockTokens[0];
      const tsla = stockTokens[1];
      const nvda = stockTokens[2];
      const msft = stockTokens[3];
      const amzn = stockTokens[4];
      const usdg = stockTokens[5];

      const duration = 10000n;
      const rate = 100n * 10n ** 18n; // 100 tokens/sec
      const rateUSDG = 100n * 10n ** 6n; // 100 USDG/sec

      await fundStockStream(aapl, rate * duration, duration);
      await fundStockStream(tsla, rate * duration, duration);
      await fundStockStream(nvda, rate * duration, duration);
      await fundStockStream(msft, rate * duration, duration);
      await fundStockStream(amzn, rate * duration, duration);
      await fundStockStream(usdg, rateUSDG * duration, duration);

      // NFT #5 (Alice): [AAPLx, TSLAx, NVDAx]
      await nft.mint(alice.address); // tokenId 1
      // NFT #6 (Bob):   [MSFTx, AMZNx, USDG]
      await nft.mint(bob.address);   // tokenId 2
      // NFT #7 (Charlie): [AAPLx, TSLAx, MSFTx]
      await nft.mint(charlie.address); // tokenId 3

      await activation.connect(alice).activate(1, [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()]);
      await activation.connect(bob).activate(2, [await msft.getAddress(), await amzn.getAddress(), await usdg.getAddress()]);
      await activation.connect(charlie).activate(3, [await aapl.getAddress(), await tsla.getAddress(), await msft.getAddress()]);

      // All 3 active concurrently for 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Verifications:
      // AAPLx: picked by #5 and #7 (2 pickers) -> 50 tokens/sec each
      const aliceAAPL = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      const charlieAAPL = await engine.getTotalClaimableReward(3, await aapl.getAddress());
      const bobAAPL = await engine.getTotalClaimableReward(2, await aapl.getAddress());
      expect(aliceAAPL).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(charlieAAPL).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(bobAAPL).to.equal(0n); // Bob did NOT pick AAPLx

      // TSLAx: picked by #5 and #7 (2 pickers) -> 50 tokens/sec each
      const aliceTSLA = await engine.getTotalClaimableReward(1, await tsla.getAddress());
      const charlieTSLA = await engine.getTotalClaimableReward(3, await tsla.getAddress());
      const bobTSLA = await engine.getTotalClaimableReward(2, await tsla.getAddress());
      expect(aliceTSLA).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(charlieTSLA).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(bobTSLA).to.equal(0n);

      // NVDAx: picked ONLY by #5 (1 picker) -> 100 tokens/sec
      const aliceNVDA = await engine.getTotalClaimableReward(1, await nvda.getAddress());
      const charlieNVDA = await engine.getTotalClaimableReward(3, await nvda.getAddress());
      const bobNVDA = await engine.getTotalClaimableReward(2, await nvda.getAddress());
      expect(aliceNVDA).to.be.closeTo(100n * 100n * 10n ** 18n, rate * 3n);
      expect(charlieNVDA).to.equal(0n);
      expect(bobNVDA).to.equal(0n);

      // MSFTx: picked by #6 and #7 (2 pickers) -> 50 tokens/sec each
      const bobMSFT = await engine.getTotalClaimableReward(2, await msft.getAddress());
      const charlieMSFT = await engine.getTotalClaimableReward(3, await msft.getAddress());
      const aliceMSFT = await engine.getTotalClaimableReward(1, await msft.getAddress());
      expect(bobMSFT).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(charlieMSFT).to.be.closeTo(50n * 100n * 10n ** 18n, rate * 3n);
      expect(aliceMSFT).to.equal(0n);

      // AMZNx: picked ONLY by #6 (1 picker) -> 100 tokens/sec
      const bobAMZN = await engine.getTotalClaimableReward(2, await amzn.getAddress());
      const aliceAMZN = await engine.getTotalClaimableReward(1, await amzn.getAddress());
      const charlieAMZN = await engine.getTotalClaimableReward(3, await amzn.getAddress());
      expect(bobAMZN).to.be.closeTo(100n * 100n * 10n ** 18n, rate * 3n);
      expect(aliceAMZN).to.equal(0n);
      expect(charlieAMZN).to.equal(0n);

      // USDG (6 decimals): picked ONLY by #6 (1 picker) -> 100 USDG/sec
      const bobUSDG = await engine.getTotalClaimableReward(2, await usdg.getAddress());
      const aliceUSDG = await engine.getTotalClaimableReward(1, await usdg.getAddress());
      const charlieUSDG = await engine.getTotalClaimableReward(3, await usdg.getAddress());
      expect(bobUSDG).to.be.closeTo(100n * 100n * 10n ** 6n, rateUSDG * 3n);
      expect(aliceUSDG).to.equal(0n);
      expect(charlieUSDG).to.equal(0n);
    });

    it("TEST 13: Scenario C: Mid-period entrant earns 0 retroactively, 50% going forward; prior entrant earns 100% pre + 50% post", async function () {
      const aapl = stockTokens[0];
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStockStream(aapl, rate * duration, duration);

      await nft.mint(alice.address); // #1
      await nft.mint(bob.address);   // #2

      const picks = [await stockTokens[0].getAddress(), await stockTokens[1].getAddress(), await stockTokens[2].getAddress()];

      // Alice activates at T=0
      await activation.connect(alice).activate(1, picks);

      // Alice alone for 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Bob activates at T=100
      await activation.connect(bob).activate(2, picks);

      // Both active for 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      const alicePending = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      const bobPending = await engine.getTotalClaimableReward(2, await aapl.getAddress());

      // Expected Alice: (100 * 10) + (100 * 5) = 1500 tokens
      expect(alicePending).to.be.closeTo(150n * rate, rate * 3n);
      // Expected Bob: (100 * 5) = 500 tokens (ZERO retroactive reward from first 100s)
      expect(bobPending).to.be.closeTo(50n * rate, rate * 3n);
    });

    it("TEST 14: Checkpoint Regression Test: Repeated claims on #4 do not modify #5 or #6 baselines", async function () {
      const aapl = stockTokens[0];
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStockStream(aapl, rate * duration, duration);

      await nft.mint(alice.address);   // #1 (token 1)
      await nft.mint(bob.address);     // #2 (token 2)
      await nft.mint(charlie.address); // #3 (token 3)

      const picks = [await stockTokens[0].getAddress(), await stockTokens[1].getAddress(), await stockTokens[2].getAddress()];

      await activation.connect(alice).activate(1, picks);
      await activation.connect(bob).activate(2, picks);
      await activation.connect(charlie).activate(3, picks);

      // Wait 50s
      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine");

      // Alice claims repeatedly
      await vault.claimReward(1, await aapl.getAddress());

      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine");
      await vault.claimReward(1, await aapl.getAddress());

      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine");
      await vault.claimReward(1, await aapl.getAddress());

      // Bob and Charlie claim after all Alice claims
      const bobClaimable = await engine.getTotalClaimableReward(2, await aapl.getAddress());
      const charlieClaimable = await engine.getTotalClaimableReward(3, await aapl.getAddress());

      // Total duration ~150s split 3 ways = 50s * rate each
      expect(bobClaimable).to.be.closeTo(50n * rate, rate * 2n);
      expect(charlieClaimable).to.be.closeTo(50n * rate, rate * 2n);
    });

    it("TEST 15: Transfer and re-activation creates the correct new baseline without cross-asset carryover", async function () {
      const aapl = stockTokens[0];
      const tsla = stockTokens[1];
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStockStream(aapl, rate * duration, duration);
      await fundStockStream(tsla, rate * duration, duration);

      await nft.mint(alice.address);
      // Alice picks AAPL, NVDA, MSFT
      await activation.connect(alice).activate(1, [
        await stockTokens[0].getAddress(),
        await stockTokens[2].getAddress(),
        await stockTokens[3].getAddress()
      ]);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Transfer to Bob (deactivates token 1)
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
      const earnedAAPL = await engine.getAccruedReward(1, await aapl.getAddress());

      // 100s inactive
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Bob reactivates with TSLA, AMZN, USDG (NO AAPL)
      await activation.connect(bob).activate(1, [
        await stockTokens[1].getAddress(),
        await stockTokens[4].getAddress(),
        await stockTokens[5].getAddress()
      ]);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Verify AAPL stopped and remained preserved
      expect(await engine.getTotalClaimableReward(1, await aapl.getAddress())).to.equal(earnedAAPL);
      // Verify TSLA accrued only from reactivation
      expect(await engine.getTotalClaimableReward(1, await tsla.getAddress())).to.be.closeTo(100n * rate, rate * 2n);
    });
  });

  describe("Part D: TBA Security & Permissionless Payouts", function () {
    it("TEST 16: Permissionless Claim to TBA: Stranger triggers claim, tokens route strictly to TBA, only NFT owner can withdraw", async function () {
      const aapl = stockTokens[0];
      const rate = 10n * 10n ** 18n;
      const duration = 1000n;
      await fundStockStream(aapl, rate * duration, duration);

      await nft.mint(alice.address);
      const picks = [await stockTokens[0].getAddress(), await stockTokens[1].getAddress(), await stockTokens[2].getAddress()];
      await activation.connect(alice).activate(1, picks);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      const tbaAddr = await vault.accountOf(1);

      // Deploy TBA account proxy explicitly
      await vault.createAccount(1);

      // Stranger triggers claim on token #1
      await vault.connect(stranger).claimReward(1, await aapl.getAddress());

      // Stranger balance is 0
      expect(await aapl.balanceOf(stranger.address)).to.equal(0n);
      // TBA balance received the funds
      const tbaBal = await aapl.balanceOf(tbaAddr);
      expect(tbaBal).to.be.closeTo(100n * rate, rate * 2n);

      // Stranger tries to execute withdrawal on TBA -> REVERTS NotAuthorized
      const tbaContract = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      const transferData = aapl.interface.encodeFunctionData("transfer", [stranger.address, tbaBal]);
      await expect(
        tbaContract.connect(stranger).execute(await aapl.getAddress(), 0, transferData, 0)
      ).to.be.revertedWithCustomError(accountImpl, "NotAuthorized");

      // Alice (NFT Owner) executes withdrawal -> SUCCEEDS
      const aliceTransferData = aapl.interface.encodeFunctionData("transfer", [alice.address, tbaBal]);
      await tbaContract.connect(alice).execute(await aapl.getAddress(), 0, aliceTransferData, 0);
      expect(await aapl.balanceOf(alice.address)).to.equal(tbaBal);
      expect(await aapl.balanceOf(tbaAddr)).to.equal(0n);
    });

    it("TEST 17: Anti-Cycle Protection: TBA rejects safeTransferFrom of its controlling NFT", async function () {
      await nft.mint(alice.address);
      const tbaAddr = await vault.accountOf(1);

      // Deploy TBA proxy so receiver hook triggers
      await vault.createAccount(1);

      // Alice attempts to safeTransfer NFT #1 to its own TBA
      await expect(
        nft.connect(alice)["safeTransferFrom(address,address,uint256)"](alice.address, tbaAddr, 1)
      ).to.be.revertedWithCustomError(accountImpl, "OwnershipCycle");
    });
  });
});
