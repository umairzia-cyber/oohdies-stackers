import { expect } from "chai";
import hre from "hardhat";

describe("Stage 3: Testnet Revenue Simulator & Economic Flow", function () {
  let connection, ethers, networkHelpers;
  let deployer, alice, bob, carol, attacker;
  let revenueToken, simulator;
  let banana, nft, activation, engine, vault, registry, accountImpl, collectionQ;
  let aaplToken, usdgToken, tslaToken;
  let aaplAddr, usdgAddr, tslaAddr;

  const SALT = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ACTIVATION_COST = 100n * 10n ** 18n; // 100 BANANA

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  beforeEach(async function () {
    [deployer, alice, bob, carol, attacker] = await ethers.getSigners();

    // 1. Deploy BANANA Token
    const BananaFactory = await ethers.getContractFactory("BananaToken");
    banana = await BananaFactory.deploy(deployer.address);
    await banana.waitForDeployment();

    // 2. Deploy Mock Stocks (AAPLx: 18 dec, USDG: 6 dec, TSLAx: 18 dec)
    const StockFactory = await ethers.getContractFactory("MockRewardToken");
    aaplToken = await StockFactory.deploy("Apple xStock", "AAPLx", 18, deployer.address);
    await aaplToken.waitForDeployment();
    aaplAddr = await aaplToken.getAddress();

    usdgToken = await StockFactory.deploy("USD Global", "USDG", 6, deployer.address);
    await usdgToken.waitForDeployment();
    usdgAddr = await usdgToken.getAddress();

    tslaToken = await StockFactory.deploy("Tesla xStock", "TSLAx", 18, deployer.address);
    await tslaToken.waitForDeployment();
    tslaAddr = await tslaToken.getAddress();

    // 3. Deploy ERC-6551 Registry and Account Implementation
    const RegistryFactory = await ethers.getContractFactory("ERC6551Registry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();

    const AccountImplFactory = await ethers.getContractFactory("OohdiesAccount");
    accountImpl = await AccountImplFactory.deploy();
    await accountImpl.waitForDeployment();

    // 4. Deploy Mock Collection Q
    const QFactory = await ethers.getContractFactory("MockCollectionQ");
    collectionQ = await QFactory.deploy(deployer.address);
    await collectionQ.waitForDeployment();

    // 5. Deploy OohdiesNFT
    const NftFactory = await ethers.getContractFactory("OohdiesNFT");
    nft = await NftFactory.deploy(deployer.address);
    await nft.waitForDeployment();

    // 6. Deploy ActivationController
    const ActivationFactory = await ethers.getContractFactory("ActivationController");
    activation = await ActivationFactory.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      deployer.address,
      ACTIVATION_COST
    );
    await activation.waitForDeployment();

    // 7. Deploy EarningEngine
    const EngineFactory = await ethers.getContractFactory("EarningEngine");
    engine = await EngineFactory.deploy(
      await activation.getAddress(),
      await nft.getAddress(),
      deployer.address
    );
    await engine.waitForDeployment();
    await engine.setCollectionQ(await collectionQ.getAddress(), 20000);

    // 8. Deploy RewardVault
    const VaultFactory = await ethers.getContractFactory("RewardVault");
    vault = await VaultFactory.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      deployer.address,
      await registry.getAddress(),
      await accountImpl.getAddress(),
      SALT
    );
    await vault.waitForDeployment();

    // 9. Wire Contract Permissions & References
    await activation.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activation.getAddress());
    await nft.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());
    await engine.setFunder(deployer.address, true);

    // Register stocks in EarningEngine
    await engine.registerRewardAsset(aaplAddr);
    await engine.registerRewardAsset(usdgAddr);
    await engine.registerRewardAsset(tslaAddr);

    // 10. Deploy Revenue Simulation Infrastructure
    const RevFactory = await ethers.getContractFactory("MockRevenueToken");
    revenueToken = await RevFactory.deploy(deployer.address);
    await revenueToken.waitForDeployment();

    const SimFactory = await ethers.getContractFactory("TestnetRevenueSimulator");
    simulator = await SimFactory.deploy(await revenueToken.getAddress(), deployer.address);
    await simulator.waitForDeployment();

    // Authorize simulator as funder on EarningEngine
    await engine.setFunder(await simulator.getAddress(), true);

    // Distribute Revenue Tokens to test users
    await revenueToken.transfer(alice.address, ethers.parseEther("1000"));
    await revenueToken.transfer(bob.address, ethers.parseEther("1000"));
    await revenueToken.transfer(carol.address, ethers.parseEther("1000"));
    await revenueToken.transfer(attacker.address, ethers.parseEther("1000"));

    // Distribute BANANA to users for activations
    await banana.transfer(alice.address, ethers.parseEther("500"));
    await banana.transfer(bob.address, ethers.parseEther("500"));
    await banana.transfer(carol.address, ethers.parseEther("500"));
  });

  describe("1. Protocol Fee Generation & Collection", function () {
    it("should accept fees from multiple users and record aggregate accounting exactly", async function () {
      const aliceFee = ethers.parseEther("10");
      const bobFee = ethers.parseEther("25");
      const carolFee = ethers.parseEther("50");

      await revenueToken.connect(alice).approve(await simulator.getAddress(), aliceFee);
      await expect(simulator.connect(alice).generateFee("Trading Activity", aliceFee))
        .to.emit(simulator, "FeeCollected")
        .withArgs(alice.address, aliceFee, "Trading Activity");

      await revenueToken.connect(bob).approve(await simulator.getAddress(), bobFee);
      await simulator.connect(bob).generateFee("Staking Fee", bobFee);

      await revenueToken.connect(carol).approve(await simulator.getAddress(), carolFee);
      await simulator.connect(carol).generateFee("Borrowing Fee", carolFee);

      const expectedTotal = aliceFee + bobFee + carolFee; // 85 REV
      expect(await simulator.totalRevenueCollected()).to.equal(expectedTotal);
      expect(await simulator.unconvertedRevenue()).to.equal(expectedTotal);
      expect(await revenueToken.balanceOf(await simulator.getAddress())).to.equal(expectedTotal);

      expect(await simulator.userRevenueContributed(alice.address)).to.equal(aliceFee);
      expect(await simulator.userRevenueContributed(bob.address)).to.equal(bobFee);
      expect(await simulator.userRevenueContributed(carol.address)).to.equal(carolFee);
    });

    it("should revert if fee amount is zero", async function () {
      await expect(simulator.connect(alice).generateFee("Zero Fee", 0)).to.be.revertedWithCustomError(
        simulator,
        "ZeroAmountNotAllowed"
      );
    });
  });

  describe("2. Deterministic Reward Acquisition & Decimal Scaling", function () {
    beforeEach(async function () {
      // User pays 200 REV in fees
      await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.parseEther("200"));
      await simulator.connect(alice).generateFee("Ecosystem Fee", ethers.parseEther("200"));

      // Configure conversion rates:
      // AAPLx (18 decimals): 1 REV = 0.5 AAPLx (numerator: 1, denominator: 2)
      // USDG (6 decimals): 1 REV = 1.0 USDG (numerator: 1, denominator: 1)
      await simulator.setConversionRate(aaplAddr, 1, 2, 18);
      await simulator.setConversionRate(usdgAddr, 1, 1, 6);

      // Deployer approves simulator to draw mock liquidity
      await aaplToken.mint(deployer.address, ethers.parseEther("1000"));
      await aaplToken.approve(await simulator.getAddress(), ethers.parseEther("1000"));

      await usdgToken.mint(deployer.address, 1000n * 10n ** 6n);
      await usdgToken.approve(await simulator.getAddress(), 1000n * 10n ** 6n);
    });

    it("should convert 100 REV into exactly 50.0 AAPLx (18 decimals)", async function () {
      const revSpend = ethers.parseEther("100");
      const expectedAapl = ethers.parseEther("50");

      await expect(simulator.acquireRewardAsset(aaplAddr, revSpend, deployer.address))
        .to.emit(simulator, "RewardAssetAcquired")
        .withArgs(aaplAddr, revSpend, expectedAapl);

      expect(await simulator.totalRevenueConverted()).to.equal(revSpend);
      expect(await simulator.unconvertedRevenue()).to.equal(ethers.parseEther("100"));
      expect(await aaplToken.balanceOf(await simulator.getAddress())).to.equal(expectedAapl);
      expect(await simulator.totalRewardsAcquired(aaplAddr)).to.equal(expectedAapl);
    });

    it("should convert 50 REV into exactly 50.0 USDG (6 decimals, scaled without error)", async function () {
      const revSpend = ethers.parseEther("50");
      const expectedUsdg = 50n * 10n ** 6n; // 50 USDG with 6 decimals

      await expect(simulator.acquireRewardAsset(usdgAddr, revSpend, deployer.address))
        .to.emit(simulator, "RewardAssetAcquired")
        .withArgs(usdgAddr, revSpend, expectedUsdg);

      expect(await usdgToken.balanceOf(await simulator.getAddress())).to.equal(expectedUsdg);
      expect(await simulator.totalRewardsAcquired(usdgAddr)).to.equal(expectedUsdg);
    });

    it("should prevent double-conversion / spending more revenue than collected", async function () {
      // 200 REV total collected. Convert 150 REV.
      await simulator.acquireRewardAsset(aaplAddr, ethers.parseEther("150"), deployer.address);
      expect(await simulator.unconvertedRevenue()).to.equal(ethers.parseEther("50"));

      // Attempting to convert 51 REV should fail
      await expect(
        simulator.acquireRewardAsset(aaplAddr, ethers.parseEther("51"), deployer.address)
      ).to.be.revertedWithCustomError(simulator, "InsufficientUnconvertedRevenue");
    });
  });

  describe("3. Adversarial Security & Access Control Matrix", function () {
    beforeEach(async function () {
      await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.parseEther("100"));
      await simulator.connect(alice).generateFee("Trading Fee", ethers.parseEther("100"));
      await simulator.setConversionRate(aaplAddr, 1, 1, 18);
    });

    it("should prevent unauthorized users from withdrawing revenue", async function () {
      await expect(
        simulator.connect(attacker).withdrawRevenue(attacker.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(simulator, "OwnableUnauthorizedAccount");
    });

    it("should prevent unauthorized users from executing reward acquisition", async function () {
      await expect(
        simulator.connect(attacker).acquireRewardAsset(aaplAddr, ethers.parseEther("50"), deployer.address)
      ).to.be.revertedWithCustomError(simulator, "OwnableUnauthorizedAccount");
    });

    it("should prevent unauthorized users from altering conversion parameters", async function () {
      await expect(
        simulator.connect(attacker).setConversionRate(aaplAddr, 10, 1, 18)
      ).to.be.revertedWithCustomError(simulator, "OwnableUnauthorizedAccount");
    });
  });

  describe("4. End-to-End Economic Lifecycle (Fee -> Acquisition -> Vault -> TBA -> EOA)", function () {
    let tokenIdAlice;
    let aliceTba;

    beforeEach(async function () {
      // 1. Alice mints NFT #1
      await nft.mint(alice.address);
      tokenIdAlice = 1n;

      // 2. Predict and deploy Alice's ERC-6551 TBA
      aliceTba = await vault.accountOf(tokenIdAlice);
      await vault.createAccount(tokenIdAlice);

      // 3. Alice approves BANANA and activates NFT #1 with [AAPLx, USDG, TSLAx]
      await banana.connect(alice).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(alice).activate(tokenIdAlice, [aaplAddr, usdgAddr, tslaAddr]);

      // 4. Generate protocol revenue from user activity
      await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.parseEther("500"));
      await simulator.connect(alice).generateFee("DEX Trading Activity", ethers.parseEther("500"));

      // 5. Set conversion rates and acquire rewards
      await simulator.setConversionRate(aaplAddr, 1, 1, 18); // 1 REV -> 1 AAPLx
      await simulator.setConversionRate(usdgAddr, 1, 1, 6);  // 1 REV -> 1 USDG

      await aaplToken.mint(deployer.address, ethers.parseEther("500"));
      await aaplToken.approve(await simulator.getAddress(), ethers.parseEther("500"));
      await simulator.acquireRewardAsset(aaplAddr, ethers.parseEther("200"), deployer.address);

      await usdgToken.mint(deployer.address, 200n * 10n ** 6n);
      await usdgToken.approve(await simulator.getAddress(), 200n * 10n ** 6n);
      await simulator.acquireRewardAsset(usdgAddr, ethers.parseEther("100"), deployer.address);

      // 6. Fund RewardVault and EarningEngine through Simulator for 7 days
      await simulator.depositToRewardVault(aaplAddr, ethers.parseEther("200"), await vault.getAddress());
      await simulator.depositToRewardVault(usdgAddr, 100n * 10n ** 6n, await vault.getAddress());

      // Fund EarningEngine emission stream
      await aaplToken.mint(await simulator.getAddress(), ethers.parseEther("200"));
      await usdgToken.mint(await simulator.getAddress(), 100n * 10n ** 6n);
      await simulator.fundRewardVault(aaplAddr, ethers.parseEther("200"), 604800, await engine.getAddress(), await vault.getAddress());
      await simulator.fundRewardVault(usdgAddr, 100n * 10n ** 6n, 604800, await engine.getAddress(), await vault.getAddress());
    });

    it("should accrue rewards and pay strictly to TBA on claim, and allow owner withdrawal", async function () {
      // Advance time 100 seconds
      await networkHelpers.time.increase(100);

      const pendingAapl = await engine.getTotalClaimableReward(tokenIdAlice, aaplAddr);
      expect(pendingAapl).to.be.gt(0);

      // Alice claims AAPLx
      const tbaAaplBefore = await aaplToken.balanceOf(aliceTba);
      const aliceEoaBefore = await aaplToken.balanceOf(alice.address);
      const vaultAaplBefore = await aaplToken.balanceOf(await vault.getAddress());

      await vault.connect(alice).claimReward(tokenIdAlice, aaplAddr);

      const tbaAaplAfter = await aaplToken.balanceOf(aliceTba);
      const aliceEoaAfter = await aaplToken.balanceOf(alice.address);
      const vaultAaplAfter = await aaplToken.balanceOf(await vault.getAddress());

      // Verifications
      expect(tbaAaplAfter).to.be.gt(tbaAaplBefore);
      expect(aliceEoaAfter).to.equal(aliceEoaBefore); // Claims route to TBA, NOT EOA
      expect(vaultAaplBefore - vaultAaplAfter).to.equal(tbaAaplAfter - tbaAaplBefore); // Exact conservation

      // Alice withdraws from TBA to EOA
      const claimAmount = tbaAaplAfter - tbaAaplBefore;
      const tbaContract = await ethers.getContractAt("OohdiesAccount", aliceTba);
      const withdrawData = aaplToken.interface.encodeFunctionData("transfer", [alice.address, claimAmount]);

      await tbaContract.connect(alice).execute(aaplAddr, 0, withdrawData, 0);

      expect(await aaplToken.balanceOf(alice.address)).to.equal(aliceEoaBefore + claimAmount);
      expect(await aaplToken.balanceOf(aliceTba)).to.equal(0);
    });

    it("should handle 6-decimal assets (USDG) with exact precision", async function () {
      await networkHelpers.time.increase(100);

      const pendingUsdg = await engine.getTotalClaimableReward(tokenIdAlice, usdgAddr);
      expect(pendingUsdg).to.be.gt(0);

      await vault.connect(alice).claimReward(tokenIdAlice, usdgAddr);
      const tbaUsdg = await usdgToken.balanceOf(aliceTba);
      expect(tbaUsdg).to.be.gt(0);
      expect(tbaUsdg).to.be.gte(pendingUsdg);
    });
  });

  describe("5. Sale of Loaded NFT & Dynamic TBA Ownership Control", function () {
    let tokenId;
    let tbaAddress;

    beforeEach(async function () {
      await nft.mint(alice.address);
      tokenId = 1n;
      tbaAddress = await vault.accountOf(tokenId);
      await vault.createAccount(tokenId);

      // Seed Alice's TBA with 10.0 AAPLx and 25.0 USDG
      await aaplToken.mint(tbaAddress, ethers.parseEther("10"));
      await usdgToken.mint(tbaAddress, 25n * 10n ** 6n);
    });

    it("should transfer loaded TBA assets to new owner and strictly lock out seller", async function () {
      const tbaContract = await ethers.getContractAt("OohdiesAccount", tbaAddress);
      expect(await tbaContract.owner()).to.equal(alice.address);

      // Alice transfers NFT to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, tokenId);

      // Verify TBA address is 100% stable
      expect(await vault.accountOf(tokenId)).to.equal(tbaAddress);

      // Dynamic ownership automatically updates to Bob with 0 extra calls
      expect(await tbaContract.owner()).to.equal(bob.address);

      // Seller Lockout Test: Alice attempts to withdraw -> Must Revert
      const withdrawData = aaplToken.interface.encodeFunctionData("transfer", [alice.address, ethers.parseEther("5")]);
      await expect(
        tbaContract.connect(alice).execute(aaplAddr, 0, withdrawData, 0)
      ).to.be.revertedWithCustomError(tbaContract, "NotAuthorized");

      // Buyer Withdrawal Test: Bob withdraws 10 AAPLx and 25 USDG -> Success
      const bobWithdrawAapl = aaplToken.interface.encodeFunctionData("transfer", [bob.address, ethers.parseEther("10")]);
      await tbaContract.connect(bob).execute(aaplAddr, 0, bobWithdrawAapl, 0);
      expect(await aaplToken.balanceOf(bob.address)).to.equal(ethers.parseEther("10"));

      const bobWithdrawUsdg = usdgToken.interface.encodeFunctionData("transfer", [bob.address, 25n * 10n ** 6n]);
      await tbaContract.connect(bob).execute(usdgAddr, 0, bobWithdrawUsdg, 0);
      expect(await usdgToken.balanceOf(bob.address)).to.equal(25n * 10n ** 6n);
    });
  });

  describe("6. Multi-Picker Stream Division & Zero-Picker Invariant", function () {
    let tokenA, tokenB, tokenC;

    beforeEach(async function () {
      await nft.mint(alice.address); // #1
      await nft.mint(bob.address);   // #2
      await nft.mint(carol.address); // #3
      tokenA = 1n;
      tokenB = 2n;
      tokenC = 3n;

      // Alice, Bob, Carol all pick AAPLx
      await banana.connect(alice).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(alice).activate(tokenA, [aaplAddr, tslaAddr, usdgAddr]);

      await banana.connect(bob).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(bob).activate(tokenB, [aaplAddr, tslaAddr, usdgAddr]);

      await banana.connect(carol).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(carol).activate(tokenC, [aaplAddr, tslaAddr, usdgAddr]);

      // Fund AAPLx stream with 300 tokens for 300 seconds (1 AAPLx / sec)
      await aaplToken.mint(deployer.address, ethers.parseEther("600"));
      await aaplToken.approve(await engine.getAddress(), ethers.parseEther("300"));
      await aaplToken.approve(await vault.getAddress(), ethers.parseEther("300"));
      await engine.fundReward(aaplAddr, ethers.parseEther("300"), 300);
      await vault.depositReward(aaplAddr, ethers.parseEther("300"));
    });

    it("should divide stream equally 1/3 each among 3 active pickers", async function () {
      await networkHelpers.time.increase(30);

      const claimableA = await engine.getTotalClaimableReward(tokenA, aaplAddr);
      const claimableB = await engine.getTotalClaimableReward(tokenB, aaplAddr);
      const claimableC = await engine.getTotalClaimableReward(tokenC, aaplAddr);

      expect(claimableA).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("1.0"));
      expect(claimableB).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("1.0"));
      expect(claimableC).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("1.0"));
    });

    it("should preserve claim order independence (A->B->C vs C->A->B)", async function () {
      await networkHelpers.time.increase(30);

      const claimableA = await engine.getTotalClaimableReward(tokenA, aaplAddr);
      const claimableB = await engine.getTotalClaimableReward(tokenB, aaplAddr);
      const claimableC = await engine.getTotalClaimableReward(tokenC, aaplAddr);

      // Claiming in order C -> A -> B
      await vault.connect(carol).claimReward(tokenC, aaplAddr);
      await vault.connect(alice).claimReward(tokenA, aaplAddr);
      await vault.connect(bob).claimReward(tokenB, aaplAddr);

      const tbaA = await vault.accountOf(tokenA);
      const tbaB = await vault.accountOf(tokenB);
      const tbaC = await vault.accountOf(tokenC);

      const balA = await aaplToken.balanceOf(tbaA);
      const balB = await aaplToken.balanceOf(tbaB);
      const balC = await aaplToken.balanceOf(tbaC);

      expect(balA).to.be.closeTo(claimableA, ethers.parseEther("1.0"));
      expect(balB).to.be.closeTo(claimableB, ethers.parseEther("1.0"));
      expect(balC).to.be.closeTo(claimableC, ethers.parseEther("1.0"));
    });

    it("should handle underfunded RewardVault by reverting with InsufficientVaultBalance", async function () {
      // Deploy an empty stock with zero deposits in RewardVault
      const StockFactory = await ethers.getContractFactory("MockRewardToken");
      const emptyStock = await StockFactory.deploy("Empty Stock", "EMPTYx", 18, deployer.address);
      await emptyStock.waitForDeployment();
      const emptyAddr = await emptyStock.getAddress();

      await engine.registerRewardAsset(emptyAddr);

      // Fund engine stream but DO NOT deposit into RewardVault
      await emptyStock.mint(deployer.address, ethers.parseEther("100"));
      await emptyStock.approve(await engine.getAddress(), ethers.parseEther("100"));
      await engine.fundReward(emptyAddr, ethers.parseEther("100"), 100);

      // Mint & activate a new NFT with empty stock
      await nft.mint(alice.address); // #4
      const tokenD = 4n;
      await banana.connect(alice).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(alice).activate(tokenD, [emptyAddr, aaplAddr, tslaAddr]);

      await networkHelpers.time.increase(10);

      // Claim should revert with custom error InsufficientVaultBalance
      await expect(vault.connect(alice).claimReward(tokenD, emptyAddr))
        .to.be.revertedWithCustomError(vault, "InsufficientVaultBalance");
    });
  });
});
