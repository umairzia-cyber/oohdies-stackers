import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, ensureRegistry, predictAccount } from "../lib/erc6551.js";

describe("Stage 2: Comprehensive Economic & Invariant Deep Audit", function () {
  let ethers;
  let deployer, alice, bob, charlie, funder;
  let nft, banana, activation, engine, vault, accountImpl;
  let aapl, tsla, nvda, msft, amzn, usdg;

  const ACTIVATION_COST = 100n * 10n ** 18n; // Exact 100 BANANA

  async function deployFixture() {
    ({ ethers } = await hre.network.create());
    const signers = await ethers.getSigners();
    deployer = signers[0];
    alice = signers[1];
    bob = signers[2];
    charlie = signers[3];
    funder = signers[4];

    await ensureRegistry(ethers.provider);

    // Deploy BananaToken
    const BananaToken = await ethers.getContractFactory("BananaToken");
    banana = await BananaToken.deploy(deployer.address);
    await banana.waitForDeployment();

    // Deploy OohdiesNFT
    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    nft = await OohdiesNFT.deploy(deployer.address);
    await nft.waitForDeployment();

    // Deploy ActivationController
    const ActivationController = await ethers.getContractFactory("ActivationController");
    activation = await ActivationController.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      deployer.address,
      ACTIVATION_COST
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

    // Deploy Mock Tokens with 4 arguments: (name, symbol, decimals, owner)
    const MockToken = await ethers.getContractFactory("MockRewardToken");
    aapl = await MockToken.deploy("Apple Stock", "AAPLx", 18, funder.address);
    tsla = await MockToken.deploy("Tesla Stock", "TSLAx", 18, funder.address);
    nvda = await MockToken.deploy("Nvidia Stock", "NVDAx", 18, funder.address);
    msft = await MockToken.deploy("Microsoft Stock", "MSFTx", 18, funder.address);
    amzn = await MockToken.deploy("Amazon Stock", "AMZNx", 18, funder.address);
    usdg = await MockToken.deploy("Stable Dollar", "USDG", 6, funder.address);

    for (const token of [aapl, tsla, nvda, msft, amzn, usdg]) {
      await token.waitForDeployment();
      await engine.registerRewardAsset(await token.getAddress());
    }

    // Distribute BANANA to all signers
    for (const user of signers) {
      await banana.transfer(user.address, 10_000n * 10n ** 18n);
      await banana.connect(user).approve(await activation.getAddress(), ethers.MaxUint256);
    }
  }

  beforeEach(async function () {
    await deployFixture();
  });

  async function fundStream(token, amount, durationSec) {
    const tokenAddr = await token.getAddress();
    const engineAddr = await engine.getAddress();
    const vaultAddr = await vault.getAddress();

    await token.connect(funder).mint(funder.address, amount * 2n);
    await token.connect(funder).approve(engineAddr, amount);
    await engine.connect(funder).fundReward(tokenAddr, amount, durationSec);

    await token.connect(funder).approve(vaultAddr, amount);
    await vault.connect(funder).depositReward(tokenAddr, amount);
  }

  describe("1. Per-Asset Reward Splitting & Mathematical Invariants", function () {
    it("Single NFT in pool earns exactly 100% of emission rate", async function () {
      const ratePerSec = 10n * 10n ** 18n;
      const duration = 1000n;
      await fundStream(aapl, ratePerSec * duration, duration);

      await nft.mint(alice.address); // tokenId 1
      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];
      await activation.connect(alice).activate(1, picks);

      // Advance time by 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      const pending = await engine.getPendingReward(1, await aapl.getAddress());
      const expected = 100n * ratePerSec;
      expect(pending).to.be.closeTo(expected, ratePerSec * 2n);
    });

    it("Two NFTs selecting the same asset split the stream exactly 50/50", async function () {
      const ratePerSec = 10n * 10n ** 18n;
      const duration = 1000n;
      await fundStream(aapl, ratePerSec * duration, duration);

      await nft.mint(alice.address); // tokenId 1
      await nft.mint(bob.address);   // tokenId 2

      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];
      await activation.connect(alice).activate(1, picks);
      await activation.connect(bob).activate(2, picks);

      // Advance time by 200 seconds
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");

      const pending1 = await engine.getPendingReward(1, await aapl.getAddress());
      const pending2 = await engine.getPendingReward(2, await aapl.getAddress());

      const expectedEach = 100n * ratePerSec;
      expect(pending1).to.be.closeTo(expectedEach, ratePerSec * 2n);
      expect(pending2).to.be.closeTo(expectedEach, ratePerSec * 2n);
      expect(pending1).to.be.closeTo(pending2, ratePerSec);
    });

    it("Five NFTs selecting the same asset split the stream 1/5th each during concurrent period", async function () {
      const ratePerSec = 100n * 10n ** 18n;
      const duration = 10000n;
      await fundStream(aapl, ratePerSec * duration, duration);

      const signers = await ethers.getSigners();
      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];

      for (let i = 0; i < 5; i++) {
        const u = signers[i];
        await nft.mint(u.address);
        await activation.connect(u).activate(i + 1, picks);
      }

      // Record baseline indices after all 5 are active
      const preRewards = [];
      for (let i = 1; i <= 5; i++) {
        preRewards.push(await engine.getTotalClaimableReward(i, await aapl.getAddress()));
      }

      // Advance time by 100 seconds while all 5 are active simultaneously
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      const expectedIncremental = (100n * ratePerSec) / 5n; // 2,000 tokens
      for (let i = 1; i <= 5; i++) {
        const post = await engine.getTotalClaimableReward(i, await aapl.getAddress());
        const incremental = post - preRewards[i - 1];
        expect(incremental).to.be.closeTo(expectedIncremental, ratePerSec * 2n);
      }
    });

    it("NFTs selecting disjoint asset pools earn 100% of their respective streams without cross-talk", async function () {
      const rateAAPL = 10n * 10n ** 18n;
      const rateMSFT = 20n * 10n ** 18n;
      const duration = 1000n;

      await fundStream(aapl, rateAAPL * duration, duration);
      await fundStream(msft, rateMSFT * duration, duration);

      await nft.mint(alice.address); // tokenId 1: picks AAPL, TSLA, NVDA
      await nft.mint(bob.address);   // tokenId 2: picks MSFT, AMZN, USDG

      await activation.connect(alice).activate(1, [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()]);
      await activation.connect(bob).activate(2, [await msft.getAddress(), await amzn.getAddress(), await usdg.getAddress()]);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Alice earns 100% of AAPL, 0 MSFT
      const aliceAAPL = await engine.getPendingReward(1, await aapl.getAddress());
      const aliceMSFT = await engine.getPendingReward(1, await msft.getAddress());
      expect(aliceAAPL).to.be.closeTo(100n * rateAAPL, rateAAPL * 2n);
      expect(aliceMSFT).to.equal(0n);

      // Bob earns 100% of MSFT, 0 AAPL
      const bobAAPL = await engine.getPendingReward(2, await aapl.getAddress());
      const bobMSFT = await engine.getPendingReward(2, await msft.getAddress());
      expect(bobMSFT).to.be.closeTo(100n * rateMSFT, rateMSFT * 2n);
      expect(bobAAPL).to.equal(0n);
    });

    it("Empty asset stream freezes emission cleanly without loss when someone picks it later", async function () {
      const rate = 10n * 10n ** 18n;
      const duration = 1000n;
      await fundStream(aapl, rate * duration, duration);

      // 500 seconds pass with NO ONE picking AAPLx
      await ethers.provider.send("evm_increaseTime", [500]);
      await ethers.provider.send("evm_mine");

      // Alice now activates picking AAPLx
      await nft.mint(alice.address);
      await activation.connect(alice).activate(1, [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()]);

      // 100 seconds pass while Alice is active
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      const pending = await engine.getPendingReward(1, await aapl.getAddress());
      // Alice earns for the 100s she was active (not retroactive 500s)
      expect(pending).to.be.closeTo(100n * rate, rate * 2n);
    });
  });

  describe("2. Historical Accounting Preservation Under Pool Transitions", function () {
    it("NFT #5 earns solo, then NFT #6 joins: NFT #5 retains 100% historical earnings + 50% shared earnings", async function () {
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStream(aapl, rate * duration, duration);

      await nft.mint(alice.address); // #1 (represents #5 in scenario)
      await nft.mint(bob.address);   // #2 (represents #6 in scenario)

      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];

      // T0: Alice activates alone
      await activation.connect(alice).activate(1, picks);

      // Period 1: 100s solo
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // T1: Bob joins pool
      await activation.connect(bob).activate(2, picks);

      // Period 2: 100s shared
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Calculate exact expected amounts:
      // Alice expected: (100s * rate) + (100s * rate / 2) = 150 * rate = 1500 tokens
      // Bob expected: (100s * rate / 2) = 50 * rate = 500 tokens
      const alicePending = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      const bobPending = await engine.getTotalClaimableReward(2, await aapl.getAddress());

      expect(alicePending).to.be.closeTo(150n * rate, rate * 3n);
      expect(bobPending).to.be.closeTo(50n * rate, rate * 3n);

      // Alice claims first
      await vault.claimReward(1, await aapl.getAddress());

      // Verify Bob's claimable reward is UNCHANGED after Alice's claim
      const bobPendingAfterAliceClaim = await engine.getTotalClaimableReward(2, await aapl.getAddress());
      expect(bobPendingAfterAliceClaim).to.be.closeTo(bobPending, rate);
    });

    it("Order-Independence Proof: #6 claiming first yields identical payouts to #5 claiming first", async function () {
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStream(aapl, rate * duration, duration);

      await nft.mint(alice.address);
      await nft.mint(bob.address);
      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];

      await activation.connect(alice).activate(1, picks);
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      await activation.connect(bob).activate(2, picks);
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Bob claims FIRST
      const bobTba = predictAccount({
        implementation: await accountImpl.getAddress(),
        tokenContract: await nft.getAddress(),
        tokenId: 2,
        chainId: (await ethers.provider.getNetwork()).chainId,
      });

      await vault.claimReward(2, await aapl.getAddress());
      const bobTbaBal = await aapl.balanceOf(bobTba);
      expect(bobTbaBal).to.be.closeTo(50n * rate, rate * 3n);

      // Alice claims SECOND
      const aliceTba = predictAccount({
        implementation: await accountImpl.getAddress(),
        tokenContract: await nft.getAddress(),
        tokenId: 1,
        chainId: (await ethers.provider.getNetwork()).chainId,
      });

      await vault.claimReward(1, await aapl.getAddress());
      const aliceTbaBal = await aapl.balanceOf(aliceTba);
      expect(aliceTbaBal).to.be.closeTo(150n * rate, rate * 3n);
    });
  });

  describe("3. Transfer Behavior & TBA Ownership Control", function () {
    it("On transfer: old owner loses control, new owner controls TBA, reward accounting in TBA is exact", async function () {
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStream(aapl, rate * duration, duration);

      await nft.mint(alice.address); // tokenId 1
      const picks = [await aapl.getAddress(), await tsla.getAddress(), await nvda.getAddress()];
      await activation.connect(alice).activate(1, picks);

      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");

      // Claim rewards into TBA
      await vault.claimReward(1, await aapl.getAddress());

      const tbaAddr = await vault.accountOf(1);
      await vault.createAccount(1);

      const tbaContract = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      expect(await tbaContract.owner()).to.equal(alice.address);

      const tbaBalanceBeforeTransfer = await aapl.balanceOf(tbaAddr);
      expect(tbaBalanceBeforeTransfer).to.be.closeTo(200n * rate, rate * 3n);

      // Alice transfers NFT #1 to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);

      // 1. Verify owner of TBA updated instantly to Bob
      expect(await tbaContract.owner()).to.equal(bob.address);

      // 2. Alice tries to withdraw from TBA -> MUST REVERT
      const transferData = aapl.interface.encodeFunctionData("transfer", [alice.address, tbaBalanceBeforeTransfer]);
      await expect(
        tbaContract.connect(alice).execute(await aapl.getAddress(), 0, transferData, 0)
      ).to.be.revertedWithCustomError(tbaContract, "NotAuthorized");

      // 3. Bob withdraws tokens from TBA -> SUCCEEDS
      await tbaContract.connect(bob).execute(await aapl.getAddress(), 0, transferData, 0);

      expect(await aapl.balanceOf(alice.address)).to.equal(tbaBalanceBeforeTransfer);
      expect(await aapl.balanceOf(tbaAddr)).to.equal(0n);
    });
  });

  describe("4. Deactivation & Reactivation with Different Assets", function () {
    it("NFT earns AAPLx, transfers, reactivates with TSLAx: AAPLx stops, TSLAx starts, old AAPLx preserved", async function () {
      const rate = 10n * 10n ** 18n;
      const duration = 10000n;
      await fundStream(aapl, rate * duration, duration);
      await fundStream(tsla, rate * duration, duration);

      await nft.mint(alice.address);
      // Phase 1: Activate with AAPLx
      await activation.connect(alice).activate(1, [await aapl.getAddress(), await nvda.getAddress(), await msft.getAddress()]);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Phase 2: Transfer to Bob (settles and deactivates NFT #1)
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await activation.isActivated(1)).to.equal(false);

      const settledAAPL = await engine.getAccruedReward(1, await aapl.getAddress());
      expect(settledAAPL).to.be.closeTo(100n * rate, rate * 3n);

      // 100s pass while deactivated
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Verify AAPLx did NOT accrue further during deactivation
      const earnedAAPLDuringDeactivation = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      expect(earnedAAPLDuringDeactivation).to.equal(settledAAPL);

      // Phase 3: Bob reactivates with TSLAx (NOT AAPLx)
      await activation.connect(bob).activate(1, [await tsla.getAddress(), await amzn.getAddress(), await usdg.getAddress()]);

      // 100s pass after reactivation
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Verify:
      // 1. AAPLx accrued reward is STILL exactly settledAAPL (preserved)
      const finalAAPL = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      expect(finalAAPL).to.equal(settledAAPL);

      // 2. TSLAx accrued reward is ~100s * rate
      const finalTSLA = await engine.getTotalClaimableReward(1, await tsla.getAddress());
      expect(finalTSLA).to.be.closeTo(100n * rate, rate * 2n);

      // Bob claims all rewards into TBA
      await vault.claimAllRewards(1);
      const tbaAddr = await vault.accountOf(1);

      expect(await aapl.balanceOf(tbaAddr)).to.equal(settledAAPL);
      expect(await tsla.balanceOf(tbaAddr)).to.be.closeTo(100n * rate, rate * 2n);
    });
  });

  describe("5. Multiple Reward Assets with Mixed Decimals (USDG 6 dec, AAPLx 18 dec)", function () {
    it("Accrues and claims USDG (6 decimals) and AAPLx (18 decimals) simultaneously without precision distortion", async function () {
      const rateAAPL = 5n * 10n ** 18n; // 5 AAPL/sec (18 dec)
      const rateUSDG = 10n * 10n ** 6n;  // 10 USDG/sec (6 dec)
      const duration = 1000n;

      await fundStream(aapl, rateAAPL * duration, duration);
      await fundStream(usdg, rateUSDG * duration, duration);

      await nft.mint(alice.address);
      await activation.connect(alice).activate(1, [await aapl.getAddress(), await usdg.getAddress(), await tsla.getAddress()]);

      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine");

      const pendingAAPL = await engine.getTotalClaimableReward(1, await aapl.getAddress());
      const pendingUSDG = await engine.getTotalClaimableReward(1, await usdg.getAddress());

      expect(pendingAAPL).to.be.closeTo(50n * rateAAPL, rateAAPL * 2n);
      expect(pendingUSDG).to.be.closeTo(50n * rateUSDG, rateUSDG * 2n);

      await vault.claimAllRewards(1);
      const tbaAddr = await vault.accountOf(1);

      expect(await aapl.balanceOf(tbaAddr)).to.be.closeTo(50n * rateAAPL, rateAAPL * 2n);
      expect(await usdg.balanceOf(tbaAddr)).to.be.closeTo(50n * rateUSDG, rateUSDG * 2n);
    });
  });
});
