import { expect } from "chai";
import hre from "hardhat";

describe("Testnet Physical Revenue Settlement & Mock Liquidity-Pool E2E", function () {
  let connection, ethers, networkHelpers;
  let deployer, alice, bob, attacker;
  let revenueToken, mockAAPLx, mockUSDG, mockGMEx;
  let pool, simulator, earningEngine, rewardVault, registry, accountImpl, oohdiesNFT, bananaToken, activationController;

  const parseREV = (val) => ethers.parseEther(val.toString());
  const parseAAPL = (val) => ethers.parseEther(val.toString());
  const parseUSDG = (val) => ethers.parseUnits(val.toString(), 6);
  const parseGME = (val) => ethers.parseEther(val.toString());

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  beforeEach(async function () {
    [deployer, alice, bob, attacker] = await ethers.getSigners();

    // 1. Deploy Tokens
    const Banana = await ethers.getContractFactory("BananaToken");
    bananaToken = await Banana.deploy(deployer.address);
    await bananaToken.waitForDeployment();

    const MockRev = await ethers.getContractFactory("MockRevenueToken");
    revenueToken = await MockRev.deploy(deployer.address);
    await revenueToken.waitForDeployment();

    const MockReward = await ethers.getContractFactory("MockRewardToken");
    mockAAPLx = await MockReward.deploy("Apple xStock", "AAPLx", 18, deployer.address);
    mockGMEx = await MockReward.deploy("GameStop xStock", "GMEx", 18, deployer.address);
    mockUSDG = await MockReward.deploy("USD Global", "USDG", 6, deployer.address);
    await mockAAPLx.waitForDeployment();
    await mockGMEx.waitForDeployment();
    await mockUSDG.waitForDeployment();

    // 2. Deploy ERC-6551 Registry & TBA Implementation
    const Reg = await ethers.getContractFactory("ERC6551Registry");
    registry = await Reg.deploy();
    await registry.waitForDeployment();

    const Acc = await ethers.getContractFactory("OohdiesAccount");
    accountImpl = await Acc.deploy();
    await accountImpl.waitForDeployment();

    // 3. Deploy OohdiesNFT & ActivationController & EarningEngine & RewardVault
    const NFT = await ethers.getContractFactory("OohdiesNFT");
    oohdiesNFT = await NFT.deploy(deployer.address);
    await oohdiesNFT.waitForDeployment();

    const Activation = await ethers.getContractFactory("ActivationController");
    activationController = await Activation.deploy(
      await oohdiesNFT.getAddress(),
      await bananaToken.getAddress(),
      deployer.address,
      ethers.parseEther("100")
    );
    await activationController.waitForDeployment();

    const Engine = await ethers.getContractFactory("EarningEngine");
    earningEngine = await Engine.deploy(
      await activationController.getAddress(),
      await oohdiesNFT.getAddress(),
      deployer.address
    );
    await earningEngine.waitForDeployment();

    const Vault = await ethers.getContractFactory("RewardVault");
    rewardVault = await Vault.deploy(
      await oohdiesNFT.getAddress(),
      await earningEngine.getAddress(),
      deployer.address,
      await registry.getAddress(),
      await accountImpl.getAddress(),
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await rewardVault.waitForDeployment();

    // Hook bindings & registration
    await activationController.setEarningEngine(await earningEngine.getAddress());
    await oohdiesNFT.setActivationController(await activationController.getAddress());
    await oohdiesNFT.setEarningEngine(await earningEngine.getAddress());
    await earningEngine.setRewardVault(await rewardVault.getAddress());

    // Register reward assets in EarningEngine
    await earningEngine.registerRewardAsset(await mockAAPLx.getAddress());
    await earningEngine.registerRewardAsset(await mockGMEx.getAddress());
    await earningEngine.registerRewardAsset(await mockUSDG.getAddress());

    // 4. Deploy TestnetRevenueSimulator
    const Sim = await ethers.getContractFactory("TestnetRevenueSimulator");
    simulator = await Sim.deploy(await revenueToken.getAddress(), deployer.address);
    await simulator.waitForDeployment();

    // Authorize simulator to fund EarningEngine & RewardVault
    await earningEngine.setFunder(await simulator.getAddress(), true);

    // 5. Deploy TestnetPhysicalLiquidityPool
    const Pool = await ethers.getContractFactory("TestnetPhysicalLiquidityPool");
    pool = await Pool.deploy(await revenueToken.getAddress(), deployer.address);
    await pool.waitForDeployment();

    // Configure rates in pool:
    // AAPLx: 1 REV = 0.5 AAPLx (1 : 2)
    // USDG:  1 REV = 1.0 USDG  (1 : 1, 6 decimals)
    // GMEx:  1 REV = 0.5 GMEx  (1 : 2)
    await pool.setAssetRate(await mockAAPLx.getAddress(), 1, 2, 18, true);
    await pool.setAssetRate(await mockUSDG.getAddress(), 1, 1, 6, true);
    await pool.setAssetRate(await mockGMEx.getAddress(), 1, 2, 18, true);

    // Pre-fund Pool Liquidity:
    await mockAAPLx.mint(deployer.address, parseAAPL("1000"));
    await mockUSDG.mint(deployer.address, parseUSDG("2000"));
    await mockGMEx.mint(deployer.address, parseGME("1000"));

    await mockAAPLx.approve(await pool.getAddress(), parseAAPL("1000"));
    await mockUSDG.approve(await pool.getAddress(), parseUSDG("2000"));
    await mockGMEx.approve(await pool.getAddress(), parseGME("1000"));

    await pool.depositRewardLiquidity(await mockAAPLx.getAddress(), parseAAPL("500"));
    await pool.depositRewardLiquidity(await mockUSDG.getAddress(), parseUSDG("1000"));
    await pool.depositRewardLiquidity(await mockGMEx.getAddress(), parseGME("500"));

    // Distribute REV to Alice & Bob for fee generation
    await revenueToken.mint(alice.address, parseREV("5000"));
    await revenueToken.mint(bob.address, parseREV("5000"));
    await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.MaxUint256);
    await revenueToken.connect(bob).approve(await simulator.getAddress(), ethers.MaxUint256);
  });

  describe("1. Two-Way Physical Revenue Settlement Mechanics", function () {
    it("physically transfers REV to the pool and reward assets to the simulator", async function () {
      // Alice generates 100 REV in fees
      await simulator.connect(alice).generateFee("User Stacking Fee", parseREV("100"));

      expect(await revenueToken.balanceOf(await simulator.getAddress())).to.equal(parseREV("100"));
      expect(await revenueToken.balanceOf(await pool.getAddress())).to.equal(0);
      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(0);
      expect(await mockAAPLx.balanceOf(await pool.getAddress())).to.equal(parseAAPL("500"));

      // Execute physical two-way settlement: spend 50 REV for AAPLx
      // Rate is 1 REV : 0.5 AAPLx -> 50 REV yields 25 AAPLx
      const tx = await simulator.settleRevenueWithPool(
        await pool.getAddress(),
        await mockAAPLx.getAddress(),
        parseREV("50")
      );

      // Verify Physical Token Balances Post-Settlement
      // Simulator REV: 100 - 50 = 50 REV
      expect(await revenueToken.balanceOf(await simulator.getAddress())).to.equal(parseREV("50"));
      // Pool REV: 0 + 50 = 50 REV
      expect(await revenueToken.balanceOf(await pool.getAddress())).to.equal(parseREV("50"));

      // Pool AAPLx: 500 - 25 = 475 AAPLx
      expect(await mockAAPLx.balanceOf(await pool.getAddress())).to.equal(parseAAPL("475"));
      // Simulator AAPLx: 0 + 25 = 25 AAPLx
      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(parseAAPL("25"));

      // Verify Invariant: physical REV in simulator equals unconvertedRevenue() exactly
      const unconverted = await simulator.unconvertedRevenue();
      expect(unconverted).to.equal(parseREV("50"));
      expect(await revenueToken.balanceOf(await simulator.getAddress())).to.equal(unconverted);
    });

    it("handles 6-decimal assets (USDG) with exact precision and zero 1e12 scaling error", async function () {
      // Bob generates 80 REV in fees
      await simulator.connect(bob).generateFee("Dex Swap Fee", parseREV("80"));

      // Rate is 1 REV (18 dec) : 1 USDG (6 dec) -> 80 REV yields 80.0 USDG (80 * 10^6)
      await simulator.settleRevenueWithPool(
        await pool.getAddress(),
        await mockUSDG.getAddress(),
        parseREV("80")
      );

      // Simulator receives exact 80.0 USDG (80000000 units)
      expect(await mockUSDG.balanceOf(await simulator.getAddress())).to.equal(parseUSDG("80"));
      expect(await mockUSDG.balanceOf(await pool.getAddress())).to.equal(parseUSDG("920"));
      expect(await revenueToken.balanceOf(await pool.getAddress())).to.equal(parseREV("80"));
    });
  });

  describe("2. RewardVault & EarningEngine Direct Funding", function () {
    it("deposits acquired reward tokens into RewardVault and funds EarningEngine emission", async function () {
      await simulator.connect(alice).generateFee("User Fee", parseREV("100"));
      await simulator.settleRevenueWithPool(
        await pool.getAddress(),
        await mockAAPLx.getAddress(),
        parseREV("100")
      );

      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(parseAAPL("50"));

      // 1. Directly deposit 25 AAPLx to RewardVault backing
      await simulator.depositToRewardVault(
        await mockAAPLx.getAddress(),
        parseAAPL("25"),
        await rewardVault.getAddress()
      );

      expect(await mockAAPLx.balanceOf(await rewardVault.getAddress())).to.equal(parseAAPL("25"));
      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(parseAAPL("25"));

      // 2. Fund EarningEngine emission stream with remaining 25 AAPLx over 3600 seconds
      await simulator.fundRewardVault(
        await mockAAPLx.getAddress(),
        parseAAPL("25"),
        3600,
        await earningEngine.getAddress(),
        await rewardVault.getAddress()
      );

      expect(await mockAAPLx.balanceOf(await earningEngine.getAddress())).to.equal(parseAAPL("25"));
      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(0);
    });
  });

  describe("3. Adversarial Security & Invariant Reverts", function () {
    it("reverts atomically when pool has insufficient reward liquidity and leaves all balances unchanged", async function () {
      await simulator.connect(alice).generateFee("Mega Fee", parseREV("2000"));

      // Pool only has 500 AAPLx (which corresponds to 1000 REV at 1:2 rate)
      // Attempting to settle 1200 REV (requires 600 AAPLx) MUST revert
      await expect(
        simulator.settleRevenueWithPool(
          await pool.getAddress(),
          await mockAAPLx.getAddress(),
          parseREV("1200")
        )
      ).to.be.revertedWithCustomError(pool, "InsufficientPoolLiquidity");

      // Assert zero state drift / atomic rollback
      expect(await revenueToken.balanceOf(await simulator.getAddress())).to.equal(parseREV("2000"));
      expect(await revenueToken.balanceOf(await pool.getAddress())).to.equal(0);
      expect(await mockAAPLx.balanceOf(await pool.getAddress())).to.equal(parseAAPL("500"));
      expect(await mockAAPLx.balanceOf(await simulator.getAddress())).to.equal(0);
      expect(await simulator.totalRevenueConverted()).to.equal(0);
    });

    it("reverts if attempting to settle more REV than spendable unconverted revenue", async function () {
      await simulator.connect(alice).generateFee("Fee", parseREV("50"));

      await expect(
        simulator.settleRevenueWithPool(
          await pool.getAddress(),
          await mockAAPLx.getAddress(),
          parseREV("60")
        )
      ).to.be.revertedWithCustomError(simulator, "InsufficientUnconvertedRevenue");
    });

    it("prevents non-owners from withdrawing pool REV or pool reward assets", async function () {
      await expect(
        pool.connect(attacker).withdrawRevenue(attacker.address, parseREV("10"))
      ).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");

      await expect(
        pool.connect(attacker).withdrawRewardLiquidity(await mockAAPLx.getAddress(), attacker.address, parseAAPL("10"))
      ).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    });

    it("prevents non-owners from altering pool asset rates", async function () {
      await expect(
        pool.connect(attacker).setAssetRate(await mockAAPLx.getAddress(), 100, 1, 18, true)
      ).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    });
  });

  describe("4. End-to-End NFT Flow: Settlement -> Vault -> TBA Claim -> EOA Withdrawal", function () {
    it("completes full physical lifecycle with exact balance conservation", async function () {
      // 1. Mint NFT #1 to Alice & Activate with [AAPLx, USDG, GMEx]
      await oohdiesNFT.connect(alice).mint(alice.address, { value: 0 }); // Token #1
      await bananaToken.connect(deployer).transfer(alice.address, ethers.parseEther("100"));
      await bananaToken.connect(alice).approve(await activationController.getAddress(), ethers.parseEther("100"));

      await activationController.connect(alice).activate(
        1,
        [await mockAAPLx.getAddress(), await mockUSDG.getAddress(), await mockGMEx.getAddress()]
      );

      // Compute predicted TBA
      const tbaAddr = await rewardVault.accountOf(1);

      // 2. Alice pays 200 REV in fees
      await simulator.connect(alice).generateFee("Trading Volume", parseREV("200"));

      // 3. Physical Settlement: spend 200 REV for 100 AAPLx
      await simulator.settleRevenueWithPool(
        await pool.getAddress(),
        await mockAAPLx.getAddress(),
        parseREV("200")
      );

      // 4. Fund RewardVault backing & EarningEngine
      await simulator.depositToRewardVault(
        await mockAAPLx.getAddress(),
        parseAAPL("50"),
        await rewardVault.getAddress()
      );
      await simulator.fundRewardVault(
        await mockAAPLx.getAddress(),
        parseAAPL("50"),
        100, // 100 seconds emission
        await earningEngine.getAddress(),
        await rewardVault.getAddress()
      );

      // Advance time by 50 seconds (50% accrual = 25 AAPLx)
      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine", []);

      // 5. Alice claims rewards -> RewardVault pays directly into TBA
      const tbaBalanceBefore = await mockAAPLx.balanceOf(tbaAddr);
      await rewardVault.connect(alice).claimReward(1, await mockAAPLx.getAddress());
      const tbaBalanceAfter = await mockAAPLx.balanceOf(tbaAddr);

      expect(tbaBalanceAfter).to.be.gt(tbaBalanceBefore);

      // 6. Deploy TBA and Alice withdraws from TBA to Alice's EOA via OohdiesAccount.execute
      await rewardVault.createAccount(1);
      const accountContract = await ethers.getContractAt("OohdiesAccount", tbaAddr);
      const withdrawAmount = tbaBalanceAfter;

      const transferData = mockAAPLx.interface.encodeFunctionData("transfer", [
        alice.address,
        withdrawAmount,
      ]);

      const aliceEoaBefore = await mockAAPLx.balanceOf(alice.address);
      await accountContract.connect(alice).execute(
        await mockAAPLx.getAddress(),
        0,
        transferData,
        0
      );
      const aliceEoaAfter = await mockAAPLx.balanceOf(alice.address);

      expect(aliceEoaAfter - aliceEoaBefore).to.equal(withdrawAmount);
      expect(await mockAAPLx.balanceOf(tbaAddr)).to.equal(0);
    });
  });
});
