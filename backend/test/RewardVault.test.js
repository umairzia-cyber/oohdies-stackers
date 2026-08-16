import { expect } from "chai";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, installRegistry, predictAccount } from "./helpers/erc6551.js";

describe("RewardVault", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const DEFAULT_ACTIVATION_COST = 1_000n * 10n ** 18n;

  let connection;
  let ethers;
  let networkHelpers;
  let PICKS = [];

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function deployVaultFixture() {
    const [owner, alice, bob, charlie, funder, attacker] = await ethers.getSigners();

    await installRegistry(networkHelpers);

    const OohdiesAccount = await ethers.getContractFactory("OohdiesAccount");
    const accountImpl = await OohdiesAccount.deploy();
    const accountImplAddr = await accountImpl.getAddress();

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

    const RewardVault = await ethers.getContractFactory("RewardVault");
    const vault = await RewardVault.deploy(
      await nft.getAddress(),
      await engine.getAddress(),
      owner.address,
      CANONICAL_REGISTRY,
      accountImplAddr,
      ZERO_SALT
    );

    await nft.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activationController.getAddress());
    await activationController.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());

    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    const aapl = await MockRewardToken.deploy("Apple Stock", "AAPLx", 18, owner.address);
    const usdg = await MockRewardToken.deploy("USD Global", "USDG", 6, owner.address);

    const aaplAddr = await aapl.getAddress();
    const usdgAddr = await usdg.getAddress();

    await engine.registerRewardAsset(aaplAddr);
    await engine.registerRewardAsset(usdgAddr);

    await engine.setFunder(funder.address, true);

    await banana.transfer(alice.address, 100_000n * 10n ** 18n);
    await banana.transfer(bob.address, 100_000n * 10n ** 18n);
    await banana.transfer(charlie.address, 100_000n * 10n ** 18n);

    await nft.mint(alice.address);
    await nft.mint(alice.address);
    await nft.mint(bob.address);

    // Copied out of the frozen Result so it can be passed back as calldata.
    PICKS = Array.from(await engine.getRegisteredRewardAssets());
    await activationController.setRequiredPicks(PICKS.length);

    return {
      banana,
      nft,
      activationController,
      engine,
      vault,
      aapl,
      usdg,
      aaplAddr,
      usdgAddr,
      owner,
      alice,
      bob,
      charlie,
      funder,
      attacker,
      networkHelpers,
      RewardVault,
      ethers,
      accountImpl,
      accountImplAddr,
      nftAddr: await nft.getAddress(),
      chainId: (await ethers.provider.getNetwork()).chainId,
    };
  }

  async function walletFor(vault, tokenId) {
    return ethers.getContractAt("OohdiesAccount", await vault.accountOf(tokenId));
  }

  async function loadFixture(fixture) {
    const ctx = await networkHelpers.loadFixture(fixture);
    // Re-sync to whichever fixture was just restored; they share this module-level variable.
    // A view call, so it adds no block and cannot disturb timing-sensitive assertions.
    if (ctx && ctx.engine) {
      PICKS = Array.from(await ctx.engine.getRegisteredRewardAssets());
    }
    return ctx;
  }

  describe("Deployment & Setup", function () {
    it("should deploy successfully", async function () {
      const { vault, nft, engine, owner } = await loadFixture(deployVaultFixture);
      expect(await vault.getAddress()).to.be.properAddress;
      expect(await vault.oohdiesNFT()).to.equal(await nft.getAddress());
      expect(await vault.earningEngine()).to.equal(await engine.getAddress());
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("reverts deployment with zero address for NFT, engine, registry or implementation", async function () {
      const { engine, owner, RewardVault, accountImplAddr } = await loadFixture(deployVaultFixture);
      const engineAddr = await engine.getAddress();

      const good = [engineAddr, engineAddr, owner.address, CANONICAL_REGISTRY, accountImplAddr, ZERO_SALT];

      for (const index of [0, 1, 3, 4]) {
        const args = [...good];
        args[index] = ZERO_ADDRESS;
        await expect(
          RewardVault.deploy(...args),
          `argument ${index} should be rejected`
        ).to.be.revertedWithCustomError(RewardVault, "ZeroAddressNotAllowed");
      }
    });
  });

  describe("Funding & Deposits", function () {
    it("depositing rewards increases vault token balance and totalDeposited", async function () {
      const { vault, usdg, usdgAddr, funder } = await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);

      await expect(vault.connect(funder).depositReward(usdgAddr, amount))
        .to.emit(vault, "RewardDeposited")
        .withArgs(usdgAddr, funder.address, amount);

      expect(await usdg.balanceOf(await vault.getAddress())).to.equal(amount);
      expect(await vault.totalDeposited(usdgAddr)).to.equal(amount);
    });

    it("reverts deposit of zero amount or zero address asset", async function () {
      const { vault, usdgAddr, funder } = await loadFixture(deployVaultFixture);

      await expect(
        vault.connect(funder).depositReward(usdgAddr, 0n)
      ).to.be.revertedWithCustomError(vault, "ZeroAmountNotAllowed");

      await expect(
        vault.connect(funder).depositReward(ZERO_ADDRESS, 100n)
      ).to.be.revertedWithCustomError(vault, "ZeroAddressNotAllowed");
    });
  });

  describe("Withdrawal & Claiming", function () {
    it("current NFT owner can claim accrued rewards", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      const walletAddr = await vault.accountOf(1n);
      const balBefore = await usdg.balanceOf(walletAddr);
      const claimTx = await vault.connect(alice).claimReward(1n, usdgAddr);
      const claimBlock = await ethers.provider.getBlock(claimTx.blockNumber);
      const balAfter = await usdg.balanceOf(walletAddr);

      const elapsed = BigInt(claimBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / duration);

      expect(balAfter - balBefore).to.equal(expected);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
    });

    it("anyone can trigger a claim, but only the owner can spend it", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, amount * 2n);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      await engine.connect(funder).fundReward(usdgAddr, amount, 100n);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      // Bob is not the owner, but the destination comes from the tokenId, not from him.
      await vault.connect(bob).claimReward(1n, usdgAddr);

      const wallet = await walletFor(vault, 1n);
      const claimed = await usdg.balanceOf(await wallet.getAddress());
      expect(claimed).to.be.gt(0n);
      expect(await usdg.balanceOf(bob.address)).to.equal(0n);

      // The ownership check moved to the point of spending.
      await vault.createAccount(1n);
      const steal = usdg.interface.encodeFunctionData("transfer", [bob.address, claimed]);
      await expect(
        wallet.connect(bob).execute(usdgAddr, 0, steal, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");

      await wallet
        .connect(alice)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [alice.address, claimed]), 0);
      expect(await usdg.balanceOf(alice.address)).to.equal(claimed);
    });

    it("reverts claim if no rewards have accrued", async function () {
      const { vault, usdgAddr, alice } = await loadFixture(deployVaultFixture);
      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "NoRewardToClaim");
    });
  });

  describe("NFT Transfers & TokenId Accounting", function () {
    it("rewards follow the tokenId through a sale: the seller cannot take them, the buyer can", async function () {
      const { banana, nft, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      const amount = 1_000n * 10n ** 6n;
      const duration = 100n;

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await engine.getAddress(), amount);
      const fundTx = await engine.connect(funder).fundReward(usdgAddr, amount, duration);
      const fundBlock = await ethers.provider.getBlock(fundTx.blockNumber);

      await usdg.mint(funder.address, amount);
      await usdg.connect(funder).approve(await vault.getAddress(), amount);
      await vault.connect(funder).depositReward(usdgAddr, amount);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      const xferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      const xferBlock = await ethers.provider.getBlock(xferTx.blockNumber);

      // The seller may still trigger the claim; it does her no good.
      await vault.connect(alice).claimReward(1n, usdgAddr);

      const elapsed = BigInt(xferBlock.timestamp - fundBlock.timestamp);
      const expected = elapsed * (amount / duration);

      const wallet = await walletFor(vault, 1n);
      expect(await usdg.balanceOf(await wallet.getAddress())).to.equal(expected);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);

      await vault.createAccount(1n);

      const steal = usdg.interface.encodeFunctionData("transfer", [alice.address, expected]);
      await expect(
        wallet.connect(alice).execute(usdgAddr, 0, steal, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");

      await wallet
        .connect(bob)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [bob.address, expected]), 0);

      expect(await usdg.balanceOf(bob.address)).to.equal(expected);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
    });

    it("withdrawing one NFT does not affect another NFT", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, bob, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await banana.connect(bob).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(bob).activate(3n, PICKS);

      await usdg.mint(funder.address, 2000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      await engine.updateRewardForAsset(1n, usdgAddr);
      await engine.updateRewardForAsset(3n, usdgAddr);
      const fundBlock = await ethers.provider.getBlock("latest");

      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await networkHelpers.time.increase(20);
      await networkHelpers.mine();

      await vault.connect(alice).claimReward(1n, usdgAddr);

      const latestBlock = await ethers.provider.getBlock("latest");
      const elapsed = BigInt(latestBlock.timestamp - fundBlock.timestamp);
      const expectedBob = (elapsed * (1000n * 10n ** 6n / 100n)) / 2n;

      const bobClaimable = await engine.getTotalClaimableReward(3n, usdgAddr);
      expect(bobClaimable).to.be.closeTo(expectedBob, 10_000_000n);

      await vault.connect(bob).claimReward(3n, usdgAddr);
    });
  });

  describe("Batch Claiming & Multi-Asset", function () {
    it("claimAllRewards claims accrued rewards across all registered assets", async function () {
      const { banana, activationController, engine, vault, usdg, aapl, usdgAddr, aaplAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      const fundTxUSDG = await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);
      const fundBlockUSDG = await ethers.provider.getBlock(fundTxUSDG.blockNumber);
      await engine.updateRewardForAsset(1n, usdgAddr);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 6n);
      await vault.connect(funder).depositReward(usdgAddr, 1000n * 10n ** 6n);

      await aapl.mint(funder.address, 1000n * 10n ** 18n);
      await aapl.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 18n);
      const fundTxAAPL = await engine.connect(funder).fundReward(aaplAddr, 1000n * 10n ** 18n, 100n);
      const fundBlockAAPL = await ethers.provider.getBlock(fundTxAAPL.blockNumber);
      await engine.updateRewardForAsset(1n, aaplAddr);

      await aapl.mint(funder.address, 1000n * 10n ** 18n);
      await aapl.connect(funder).approve(await vault.getAddress(), 1000n * 10n ** 18n);
      await vault.connect(funder).depositReward(aaplAddr, 1000n * 10n ** 18n);

      await networkHelpers.time.increase(50);
      await networkHelpers.mine();

      const walletAddr = await vault.accountOf(1n);
      const usdgBalBefore = await usdg.balanceOf(walletAddr);
      const aaplBalBefore = await aapl.balanceOf(walletAddr);

      const claimTx = await vault.connect(alice).claimAllRewards(1n);
      const claimBlock = await ethers.provider.getBlock(claimTx.blockNumber);

      const usdgBalAfter = await usdg.balanceOf(walletAddr);
      const aaplBalAfter = await aapl.balanceOf(walletAddr);

      const elapsedUSDG = BigInt(claimBlock.timestamp - fundBlockUSDG.timestamp);
      const elapsedAAPL = BigInt(claimBlock.timestamp - fundBlockAAPL.timestamp);
      const expectedUSDG = elapsedUSDG * (1000n * 10n ** 6n / 100n);
      const expectedAAPL = elapsedAAPL * (1000n * 10n ** 18n / 100n);

      expect(usdgBalAfter - usdgBalBefore).to.equal(expectedUSDG);
      expect(aaplBalAfter - aaplBalBefore).to.equal(expectedAAPL);
    });
  });

  describe("Invariants & Security", function () {
    it("INVARIANT: actual vault balance must always back claimable withdrawals", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder, networkHelpers } =
        await loadFixture(deployVaultFixture);

      await banana.connect(alice).approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      await usdg.mint(funder.address, 1000n * 10n ** 6n);
      await usdg.connect(funder).approve(await engine.getAddress(), 1000n * 10n ** 6n);
      await engine.connect(funder).fundReward(usdgAddr, 1000n * 10n ** 6n, 100n);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "InsufficientVaultBalance");
    });

    it("vault owner CANNOT steal or withdraw user reward allocations", async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      const iface = vault.interface;
      const functionNames = iface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(functionNames).to.not.include("sweep");
      expect(functionNames).to.not.include("withdrawAdmin");
      expect(functionNames).to.not.include("emergencyWithdraw");
      expect(functionNames).to.not.include("withdrawTokens");
    });

    it("pause halts claims and deposits, unpause resumes operations without modifying balances", async function () {
      const { vault, usdg, usdgAddr, funder, alice } = await loadFixture(deployVaultFixture);

      await vault.pause();

      await usdg.mint(funder.address, 100n * 10n ** 6n);
      await usdg.connect(funder).approve(await vault.getAddress(), 100n * 10n ** 6n);

      await expect(
        vault.connect(funder).depositReward(usdgAddr, 100n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.unpause();

      const tx = vault.connect(funder).depositReward(usdgAddr, 100n * 10n ** 6n);
      await expect(tx).to.emit(vault, "RewardDeposited").withArgs(usdgAddr, funder.address, 100n * 10n ** 6n);
    });
  });

  describe("Token bound account payouts (ERC-6551)", function () {
    const AMOUNT = 1_000n * 10n ** 6n;
    const DURATION = 100n;

    /** Activates Oohdie #1, funds engine and vault for both assets, then lets time pass. */
    async function accrueFixture() {
      const ctx = await deployVaultFixture();
      const { banana, activationController, engine, vault, usdg, usdgAddr, aapl, aaplAddr, alice, funder } = ctx;

      await banana
        .connect(alice)
        .approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      for (const [token, addr] of [[usdg, usdgAddr], [aapl, aaplAddr]]) {
        await token.mint(funder.address, AMOUNT * 2n);
        await token.connect(funder).approve(await engine.getAddress(), AMOUNT);
        await engine.connect(funder).fundReward(addr, AMOUNT, DURATION);
        await token.connect(funder).approve(await vault.getAddress(), AMOUNT);
        await vault.connect(funder).depositReward(addr, AMOUNT);
      }

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      return ctx;
    }

    it("accountOf agrees with the registry's own derivation", async function () {
      const { vault, accountImplAddr, nftAddr, chainId } = await loadFixture(deployVaultFixture);

      expect(await vault.accountOf(1n)).to.equal(
        predictAccount({
          implementation: accountImplAddr,
          tokenContract: nftAddr,
          tokenId: 1n,
          chainId,
        })
      );
    });

    it("pays the NFT's wallet, not the caller", async function () {
      const { vault, usdg, usdgAddr, alice } = await loadFixture(accrueFixture);

      const wallet = await vault.accountOf(1n);
      const aliceBefore = await usdg.balanceOf(alice.address);

      await vault.connect(alice).claimReward(1n, usdgAddr);

      expect(await usdg.balanceOf(wallet)).to.be.gt(0n);
      // Alice pressed the button but received nothing directly.
      expect(await usdg.balanceOf(alice.address)).to.equal(aliceBefore);
    });

    it("names the wallet as the recipient in RewardClaimed", async function () {
      const { vault, usdgAddr, alice } = await loadFixture(accrueFixture);
      const wallet = await vault.accountOf(1n);

      const tx = await vault.connect(alice).claimReward(1n, usdgAddr);
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => { try { return vault.interface.parseLog(log); } catch { return null; } })
        .find((parsed) => parsed?.name === "RewardClaimed");

      expect(event.args.recipient).to.equal(wallet);
      expect(event.args.tokenId).to.equal(1n);
    });

    it("lets a stranger trigger the claim, and the stranger gains nothing", async function () {
      const { vault, usdg, usdgAddr, attacker } = await loadFixture(accrueFixture);

      const wallet = await vault.accountOf(1n);

      // Permissionless: a keeper bot can sweep for everyone without being able to redirect it.
      await vault.connect(attacker).claimReward(1n, usdgAddr);

      expect(await usdg.balanceOf(wallet)).to.be.gt(0n);
      expect(await usdg.balanceOf(attacker.address)).to.equal(0n);
    });

    it("only the NFT owner can spend what was claimed", async function () {
      const { vault, usdg, usdgAddr, alice, attacker } = await loadFixture(accrueFixture);

      await vault.connect(attacker).claimReward(1n, usdgAddr);

      const wallet = await walletFor(vault, 1n);
      await vault.createAccount(1n);
      const balance = await usdg.balanceOf(await wallet.getAddress());

      const spend = usdg.interface.encodeFunctionData("transfer", [attacker.address, balance]);
      await expect(
        wallet.connect(attacker).execute(usdgAddr, 0, spend, 0)
      ).to.be.revertedWithCustomError(wallet, "NotAuthorized");

      // The authorization did not disappear, it moved here.
      await wallet
        .connect(alice)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [alice.address, balance]), 0);

      expect(await usdg.balanceOf(alice.address)).to.equal(balance);
    });

    it("works before the wallet exists, and the funds are spendable once it is created", async function () {
      const { vault, usdg, usdgAddr, alice } = await loadFixture(accrueFixture);

      const walletAddr = await vault.accountOf(1n);
      expect(await ethers.provider.getCode(walletAddr)).to.equal("0x");

      // Which is why the vault never forces account creation on a claim.
      await vault.connect(alice).claimReward(1n, usdgAddr);
      const balance = await usdg.balanceOf(walletAddr);
      expect(balance).to.be.gt(0n);

      await vault.createAccount(1n);
      const wallet = await ethers.getContractAt("OohdiesAccount", walletAddr);
      await wallet
        .connect(alice)
        .execute(usdgAddr, 0, usdg.interface.encodeFunctionData("transfer", [alice.address, balance]), 0);

      expect(await usdg.balanceOf(alice.address)).to.equal(balance);
    });

    it("claimAllRewards pays every asset into the same wallet", async function () {
      const { vault, usdg, aapl, alice } = await loadFixture(accrueFixture);
      const wallet = await vault.accountOf(1n);

      await vault.connect(alice).claimAllRewards(1n);

      expect(await usdg.balanceOf(wallet)).to.be.gt(0n);
      expect(await aapl.balanceOf(wallet)).to.be.gt(0n);
      expect(await usdg.balanceOf(alice.address)).to.equal(0n);
      expect(await aapl.balanceOf(alice.address)).to.equal(0n);
    });

    it("createAccount is permissionless and idempotent", async function () {
      const { vault, attacker } = await loadFixture(deployVaultFixture);
      const predicted = await vault.accountOf(1n);

      await vault.connect(attacker).createAccount(1n);
      expect(await ethers.provider.getCode(predicted)).to.not.equal("0x");

      await vault.connect(attacker).createAccount(1n);
      expect(await vault.createAccount.staticCall(1n)).to.equal(predicted);
    });

    it("still tracks totalClaimed", async function () {
      const { vault, usdg, usdgAddr, alice } = await loadFixture(accrueFixture);
      const wallet = await vault.accountOf(1n);

      await vault.connect(alice).claimReward(1n, usdgAddr);

      expect(await vault.totalClaimed(usdgAddr)).to.equal(await usdg.balanceOf(wallet));
    });

    it("still reverts when the vault cannot cover the claim", async function () {
      const { banana, activationController, engine, vault, usdg, usdgAddr, alice, funder } =
        await loadFixture(deployVaultFixture);

      await banana
        .connect(alice)
        .approve(await activationController.getAddress(), DEFAULT_ACTIVATION_COST);
      await activationController.connect(alice).activate(1n, PICKS);

      // Fund the engine's accounting but never deposit the actual tokens into the vault.
      await usdg.mint(funder.address, AMOUNT);
      await usdg.connect(funder).approve(await engine.getAddress(), AMOUNT);
      await engine.connect(funder).fundReward(usdgAddr, AMOUNT, DURATION);

      await networkHelpers.time.increase(10);
      await networkHelpers.mine();

      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "InsufficientVaultBalance");
    });

    it("still refuses claims while paused", async function () {
      const { vault, usdgAddr, alice, owner } = await loadFixture(accrueFixture);

      await vault.connect(owner).pause();
      await expect(
        vault.connect(alice).claimReward(1n, usdgAddr)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });
});
