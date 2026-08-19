import { expect } from "chai";
import hre from "hardhat";

describe("Stage 5: Long-Running Economic Stress, Repeated Revenue Cycles & Vault-Solvency", function () {
  let connection, ethers, networkHelpers;
  let deployer, alice, bob, carol, attacker;
  let revenueToken, simulator;
  let banana, nft, activation, engine, vault, registry, accountImpl, collectionQ;
  let aaplToken, usdgToken, tslaToken, gmeToken;
  let aaplAddr, usdgAddr, tslaAddr, gmeAddr;

  const SALT = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ACTIVATION_COST = 100n * 10n ** 18n; // 100 BANANA
  const PRECISION_FACTOR = 10n ** 36n;
  const BASE_WEIGHT = 10000n;

  /**
   * Reference Ledger & State Machine Model matching Solidity contracts
   */
  class Stage5ReferenceLedger {
    constructor() {
      this.totalRevenueCollected = 0n;
      this.totalRevenueConverted = 0n;
      this.userRevenueContributed = {};
      this.conversionRates = {}; // asset -> { num, den, dec }
      this.vaultBalances = {}; // asset -> bigint
      this.tbaBalances = {}; // tokenId -> { asset -> bigint }
      this.eoaBalances = {}; // address -> { asset -> bigint }
      this.activePickers = {}; // asset -> Set(tokenId)
      this.nftPicks = {}; // tokenId -> Array(asset)
      this.nftActive = {}; // tokenId -> bool
      this.nftOwner = {}; // tokenId -> address
      this.tokenTba = {}; // tokenId -> address

      // EarningEngine Reward Math Model
      this.rewardData = {}; // asset -> { rewardRate, periodFinish, lastUpdateTime, globalRewardIndex, totalFunded }
      this.userRewardIndex = {}; // tokenId -> { asset -> bigint }
      this.accruedRewards = {}; // tokenId -> { asset -> bigint }
    }

    initAsset(asset, decimals, num = 1n, den = 1n) {
      this.conversionRates[asset] = { num, den, decimals };
      this.vaultBalances[asset] = 0n;
      this.activePickers[asset] = new Set();
      this.rewardData[asset] = {
        rewardRate: 0n,
        periodFinish: 0n,
        lastUpdateTime: 0n,
        globalRewardIndex: 0n,
        totalFunded: 0n,
      };
    }

    getUnconvertedRevenue() {
      if (this.totalRevenueCollected <= this.totalRevenueConverted) return 0n;
      return this.totalRevenueCollected - this.totalRevenueConverted;
    }

    recordFee(user, amount) {
      this.totalRevenueCollected += amount;
      this.userRevenueContributed[user] = (this.userRevenueContributed[user] || 0n) + amount;
    }

    acquireAsset(asset, revenueToSpend) {
      const rate = this.conversionRates[asset];
      const baseAmount = (revenueToSpend * rate.num) / rate.den;
      let acquired = baseAmount;
      if (rate.decimals < 18) {
        acquired = baseAmount / (10n ** BigInt(18 - rate.decimals));
      } else if (rate.decimals > 18) {
        acquired = baseAmount * (10n ** BigInt(rate.decimals - 18));
      }
      this.totalRevenueConverted += revenueToSpend;
      return acquired;
    }

    updateGlobalIndex(asset, currentTimestamp) {
      const info = this.rewardData[asset];
      const lastApplicable = currentTimestamp < info.periodFinish ? currentTimestamp : info.periodFinish;
      if (lastApplicable > info.lastUpdateTime) {
        const totalWeight = BigInt(this.activePickers[asset].size) * BASE_WEIGHT;
        if (totalWeight > 0n) {
          const timeDelta = lastApplicable - info.lastUpdateTime;
          const emitted = timeDelta * info.rewardRate;
          info.globalRewardIndex += (emitted * PRECISION_FACTOR) / totalWeight;
        }
        info.lastUpdateTime = lastApplicable;
      }
    }

    fundReward(asset, amount, duration, currentTimestamp) {
      this.updateGlobalIndex(asset, currentTimestamp);
      const info = this.rewardData[asset];
      if (currentTimestamp >= info.periodFinish) {
        info.rewardRate = amount / duration;
      } else {
        const remainingTime = info.periodFinish - currentTimestamp;
        const leftover = remainingTime * info.rewardRate;
        info.rewardRate = (amount + leftover) / duration;
      }
      info.lastUpdateTime = currentTimestamp;
      info.periodFinish = currentTimestamp + duration;
      info.totalFunded += amount;
      this.vaultBalances[asset] += amount;
    }

    activateNft(tokenId, owner, picks, currentTimestamp) {
      this.nftOwner[tokenId] = owner;
      this.nftPicks[tokenId] = picks;
      this.nftActive[tokenId] = true;
      if (!this.userRewardIndex[tokenId]) this.userRewardIndex[tokenId] = {};
      if (!this.accruedRewards[tokenId]) this.accruedRewards[tokenId] = {};

      for (const asset of picks) {
        this.updateGlobalIndex(asset, currentTimestamp);
        this.activePickers[asset].add(tokenId);
        this.userRewardIndex[tokenId][asset] = this.rewardData[asset].globalRewardIndex;
        if (!this.accruedRewards[tokenId][asset]) {
          this.accruedRewards[tokenId][asset] = 0n;
        }
      }
    }

    deactivateOnTransfer(tokenId, newOwner, currentTimestamp) {
      this.nftOwner[tokenId] = newOwner;
      const oldPicks = this.nftPicks[tokenId] || [];
      for (const asset of oldPicks) {
        this.updateGlobalIndex(asset, currentTimestamp);
        const uIndex = this.userRewardIndex[tokenId][asset] || 0n;
        const gIndex = this.rewardData[asset].globalRewardIndex;
        const pending = ((gIndex - uIndex) * BASE_WEIGHT) / PRECISION_FACTOR;
        this.accruedRewards[tokenId][asset] = (this.accruedRewards[tokenId][asset] || 0n) + pending;
        this.userRewardIndex[tokenId][asset] = gIndex;
        this.activePickers[asset].delete(tokenId);
      }
      this.nftPicks[tokenId] = [];
      this.nftActive[tokenId] = false;
    }

    getClaimable(tokenId, asset, currentTimestamp) {
      if (!this.accruedRewards[tokenId]) return 0n;
      let total = this.accruedRewards[tokenId][asset] || 0n;
      if (this.nftActive[tokenId] && (this.nftPicks[tokenId] || []).includes(asset)) {
        const info = this.rewardData[asset];
        const lastApplicable = currentTimestamp < info.periodFinish ? currentTimestamp : info.periodFinish;
        let gIndex = info.globalRewardIndex;
        if (lastApplicable > info.lastUpdateTime) {
          const totalWeight = BigInt(this.activePickers[asset].size) * BASE_WEIGHT;
          if (totalWeight > 0n) {
            const timeDelta = lastApplicable - info.lastUpdateTime;
            const emitted = timeDelta * info.rewardRate;
            gIndex += (emitted * PRECISION_FACTOR) / totalWeight;
          }
        }
        const uIndex = this.userRewardIndex[tokenId][asset] || 0n;
        const pending = ((gIndex - uIndex) * BASE_WEIGHT) / PRECISION_FACTOR;
        total += pending;
      }
      return total;
    }

    claimReward(tokenId, asset, currentTimestamp) {
      const claimable = this.getClaimable(tokenId, asset, currentTimestamp);
      if (claimable === 0n) return 0n;
      this.updateGlobalIndex(asset, currentTimestamp);
      this.accruedRewards[tokenId][asset] = 0n;
      if (this.nftActive[tokenId] && (this.nftPicks[tokenId] || []).includes(asset)) {
        this.userRewardIndex[tokenId][asset] = this.rewardData[asset].globalRewardIndex;
      }
      this.vaultBalances[asset] -= claimable;
      if (!this.tbaBalances[tokenId]) this.tbaBalances[tokenId] = {};
      this.tbaBalances[tokenId][asset] = (this.tbaBalances[tokenId][asset] || 0n) + claimable;
      return claimable;
    }

    withdrawFromTba(tokenId, asset, toAddress, amount) {
      const currentTbaBal = (this.tbaBalances[tokenId] && this.tbaBalances[tokenId][asset]) || 0n;
      if (amount > currentTbaBal) throw new Error("Insufficient TBA balance");
      this.tbaBalances[tokenId][asset] -= amount;
      if (!this.eoaBalances[toAddress]) this.eoaBalances[toAddress] = {};
      this.eoaBalances[toAddress][asset] = (this.eoaBalances[toAddress][asset] || 0n) + amount;
    }
  }

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

    // 2. Deploy Mock Stocks (AAPLx: 18, USDG: 6, TSLAx: 18, GMEx: 18)
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

    gmeToken = await StockFactory.deploy("GameStop xStock", "GMEx", 18, deployer.address);
    await gmeToken.waitForDeployment();
    gmeAddr = await gmeToken.getAddress();

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

    // 9. Wire Core Contracts & Register Stocks
    await activation.setEarningEngine(await engine.getAddress());
    await nft.setActivationController(await activation.getAddress());
    await nft.setEarningEngine(await engine.getAddress());
    await engine.setRewardVault(await vault.getAddress());

    for (const token of [aaplToken, usdgToken, tslaToken, gmeToken]) {
      const addr = await token.getAddress();
      await engine.registerRewardAsset(addr);
    }

    // 10. Deploy MockRevenueToken & TestnetRevenueSimulator
    const RevTokenFactory = await ethers.getContractFactory("MockRevenueToken");
    revenueToken = await RevTokenFactory.deploy(deployer.address);
    await revenueToken.waitForDeployment();

    const SimulatorFactory = await ethers.getContractFactory("TestnetRevenueSimulator");
    simulator = await SimulatorFactory.deploy(await revenueToken.getAddress(), deployer.address);
    await simulator.waitForDeployment();

    await engine.setFunder(await simulator.getAddress(), true);
    await engine.setFunder(deployer.address, true);

    // Configure standard conversion rates (1 REV = 0.5 AAPLx, 1 REV = 1.0 USDG, 1 REV = 0.5 TSLAx, 1 REV = 0.5 GMEx)
    await simulator.setConversionRate(aaplAddr, 1, 2, 18);
    await simulator.setConversionRate(usdgAddr, 1, 1, 6);
    await simulator.setConversionRate(tslaAddr, 1, 2, 18);
    await simulator.setConversionRate(gmeAddr, 1, 2, 18);

    // Initial token distributions
    await revenueToken.transfer(alice.address, ethers.parseEther("50000"));
    await revenueToken.transfer(bob.address, ethers.parseEther("50000"));
    await revenueToken.transfer(attacker.address, ethers.parseEther("10000"));

    await banana.transfer(alice.address, ethers.parseEther("10000"));
    await banana.transfer(bob.address, ethers.parseEther("10000"));

    // Mint liquidity to deployer for simulator acquisitions
    for (const token of [aaplToken, tslaToken, gmeToken]) {
      await token.mint(deployer.address, ethers.parseEther("100000"));
      await token.approve(await simulator.getAddress(), ethers.MaxUint256);
      await token.approve(await engine.getAddress(), ethers.MaxUint256);
      await token.approve(await vault.getAddress(), ethers.MaxUint256);
    }
    await usdgToken.mint(deployer.address, 100000n * 10n ** 6n);
    await usdgToken.approve(await simulator.getAddress(), ethers.MaxUint256);
    await usdgToken.approve(await engine.getAddress(), ethers.MaxUint256);
    await usdgToken.approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("1. Deterministic Multi-Cycle State Machine (100 Sequences)", function () {
    it("should match mathematical reference model across 100 complex economic state transitions", async function () {
      this.timeout(120000);

      const ledger = new Stage5ReferenceLedger();
      ledger.initAsset(aaplAddr, 18, 1n, 2n);
      ledger.initAsset(usdgAddr, 6, 1n, 1n);
      ledger.initAsset(tslaAddr, 18, 1n, 2n);
      ledger.initAsset(gmeAddr, 18, 1n, 2n);

      // Mint test NFTs for Alice and Bob
      await nft.mint(alice.address); // Token 1
      await nft.mint(bob.address);   // Token 2
      await nft.mint(alice.address); // Token 3
      await nft.mint(bob.address);   // Token 4

      await banana.connect(alice).approve(await activation.getAddress(), ethers.MaxUint256);
      await banana.connect(bob).approve(await activation.getAddress(), ethers.MaxUint256);
      await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.MaxUint256);
      await revenueToken.connect(bob).approve(await simulator.getAddress(), ethers.MaxUint256);

      let currentBlockTime = BigInt(await networkHelpers.time.latest());

      const getTxTimestamp = async (tx) => {
        const receipt = await tx.wait();
        const b = await ethers.provider.getBlock(receipt.blockNumber);
        return BigInt(b.timestamp);
      };

      // 100 Multi-Cycle State Machine Transitions
      for (let seq = 1; seq <= 100; seq++) {
        const cycleType = seq % 5;

        if (cycleType === 0) {
          // --- Action A: Fee Generation & Collection ---
          const feeAmount = ethers.parseEther((10 + (seq % 40)).toString());
          const tx = await simulator.connect(alice).generateFee(`Trading Fee Seq ${seq}`, feeAmount);
          await tx.wait();
          ledger.recordFee(alice.address, feeAmount);

          const unconv = await simulator.unconvertedRevenue();
          expect(unconv).to.equal(ledger.getUnconvertedRevenue());
        } else if (cycleType === 1) {
          // --- Action B: Deterministic Acquisition & Vault Funding ---
          const unconv = await simulator.unconvertedRevenue();
          if (unconv > ethers.parseEther("5")) {
            const spend = ethers.parseEther("5");
            const assetChoice = seq % 2 === 0 ? aaplAddr : usdgAddr;

            const acquired = ledger.acquireAsset(assetChoice, spend);
            await (await simulator.acquireRewardAsset(assetChoice, spend, deployer.address)).wait();

            const duration = 7n * 86400n;

            await (await vault.depositReward(assetChoice, acquired)).wait();
            const fundTx = await simulator.fundRewardVault(assetChoice, acquired, duration, await engine.getAddress(), await vault.getAddress());
            const fundTs = await getTxTimestamp(fundTx);

            ledger.fundReward(assetChoice, acquired, duration, fundTs);
          }
        } else if (cycleType === 2) {
          // --- Action C: NFT Activation / Reactivation ---
          const isAct1 = await activation.isActivated(1);
          if (!isAct1) {
            const picks = [aaplAddr, usdgAddr, tslaAddr];
            const owner1 = await nft.ownerOf(1);
            const signer1 = owner1 === alice.address ? alice : bob;
            const actTx = await activation.connect(signer1).activate(1, picks);
            const actTs = await getTxTimestamp(actTx);
            ledger.activateNft(1, owner1, picks, actTs);
          }
          const isAct2 = await activation.isActivated(2);
          if (!isAct2) {
            const picks = [aaplAddr, usdgAddr, gmeAddr];
            const owner2 = await nft.ownerOf(2);
            const signer2 = owner2 === alice.address ? alice : bob;
            const actTx = await activation.connect(signer2).activate(2, picks);
            const actTs = await getTxTimestamp(actTx);
            ledger.activateNft(2, owner2, picks, actTs);
          }
        } else if (cycleType === 3) {
          // --- Action D: Time Advance & Claiming into TBA ---
          await networkHelpers.time.increase(3600); // advance 1 hour
          currentBlockTime = BigInt(await networkHelpers.time.latest());

          for (const tid of [1, 2]) {
            if (await activation.isActivated(tid)) {
              for (const asset of [aaplAddr, usdgAddr]) {
                currentBlockTime = BigInt(await networkHelpers.time.latest());
                const onChainClaimable = await engine.getTotalClaimableReward(tid, asset);
                const expectedClaimable = ledger.getClaimable(tid, asset, currentBlockTime);

                // Check claimable agrees with reference model
                const diff = onChainClaimable > expectedClaimable ? onChainClaimable - expectedClaimable : expectedClaimable - onChainClaimable;
                expect(diff).to.be.lte(1000n);

                if (onChainClaimable > 0n) {
                  const owner = await nft.ownerOf(tid);
                  const signer = owner === alice.address ? alice : bob;
                  const claimTx = await vault.connect(signer).claimReward(tid, asset);
                  const claimTs = await getTxTimestamp(claimTx);
                  ledger.claimReward(tid, asset, claimTs);
                }
              }
            }
          }
        } else if (cycleType === 4) {
          // --- Action E: NFT Transfer Mid-Cycle & TBA Withdrawal ---
          const isAct1 = await activation.isActivated(1);
          const owner1 = await nft.ownerOf(1);

          if (isAct1 && owner1 === alice.address) {
            // Transfer Token 1 from Alice to Bob
            const transferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
            const transferTs = await getTxTimestamp(transferTx);
            ledger.deactivateOnTransfer(1, bob.address, transferTs);

            expect(await activation.isActivated(1)).to.be.false;
            const chosen = await engine.getChosenAssets(1);
            expect(chosen.length).to.equal(0);
          }
        }
      }

      // Final Conservation Assertions
      const totalCollected = await simulator.totalRevenueCollected();
      const totalConverted = await simulator.totalRevenueConverted();
      const remainingUnconv = await simulator.unconvertedRevenue();
      expect(totalCollected).to.equal(totalConverted + remainingUnconv);
      expect(totalCollected).to.equal(ledger.totalRevenueCollected);
    });
  });

  describe("2. Fuzzed State Machine Transitions (500 Sequences)", function () {
    it("should preserve exact conservation and zero-leakage invariants across 500 fuzzed operations", async function () {
      this.timeout(180000);

      const ledger = new Stage5ReferenceLedger();
      ledger.initAsset(aaplAddr, 18, 1n, 2n);
      ledger.initAsset(usdgAddr, 6, 1n, 1n);
      ledger.initAsset(tslaAddr, 18, 1n, 2n);
      ledger.initAsset(gmeAddr, 18, 1n, 2n);

      await nft.mint(alice.address); // Token 1
      await nft.mint(bob.address);   // Token 2

      await banana.connect(alice).approve(await activation.getAddress(), ethers.MaxUint256);
      await banana.connect(bob).approve(await activation.getAddress(), ethers.MaxUint256);
      await revenueToken.connect(alice).approve(await simulator.getAddress(), ethers.MaxUint256);
      await revenueToken.connect(bob).approve(await simulator.getAddress(), ethers.MaxUint256);

      const assets = [aaplAddr, usdgAddr, tslaAddr, gmeAddr];

      for (let fuzz = 1; fuzz <= 500; fuzz++) {
        const action = fuzz % 6;

        if (action === 0) {
          // Fuzz Fee Generation
          const fee = ethers.parseEther(((fuzz % 50) + 1).toString());
          const user = fuzz % 2 === 0 ? alice : bob;
          await simulator.connect(user).generateFee(`Fuzz Fee ${fuzz}`, fee);
          ledger.recordFee(user.address, fee);
        } else if (action === 1) {
          // Fuzz Acquisition & Funding
          const unconv = await simulator.unconvertedRevenue();
          if (unconv >= ethers.parseEther("2")) {
            const spend = ethers.parseEther("2");
            const asset = assets[fuzz % assets.length];
            const acquired = ledger.acquireAsset(asset, spend);
            await simulator.acquireRewardAsset(asset, spend, deployer.address);

            const duration = BigInt(3600 + (fuzz % 7) * 86400);
            const currentTimestamp = BigInt(await networkHelpers.time.latest());

            await vault.depositReward(asset, acquired);
            await simulator.fundRewardVault(asset, acquired, duration, await engine.getAddress(), await vault.getAddress());
            ledger.fundReward(asset, acquired, duration, currentTimestamp);
          }
        } else if (action === 2) {
          // Fuzz Time Step
          const step = (fuzz % 100) * 60 + 10;
          await networkHelpers.time.increase(step);
        } else if (action === 3) {
          // Fuzz Activation
          const tid = (fuzz % 2) + 1;
          const isAct = await activation.isActivated(tid);
          if (!isAct) {
            const owner = await nft.ownerOf(tid);
            const signer = owner === alice.address ? alice : bob;
            const picks = [assets[0], assets[1], assets[(fuzz % 2) + 2]];
            const ts = BigInt(await networkHelpers.time.latest());
            await activation.connect(signer).activate(tid, picks);
            ledger.activateNft(tid, owner, picks, ts);
          }
        } else if (action === 4) {
          // Fuzz Claim
          const tid = (fuzz % 2) + 1;
          const isAct = await activation.isActivated(tid);
          if (isAct) {
            const asset = assets[fuzz % 2];
            const owner = await nft.ownerOf(tid);
            const signer = owner === alice.address ? alice : bob;
            const claimable = await engine.getTotalClaimableReward(tid, asset);
            if (claimable > 0n) {
              const ts = BigInt(await networkHelpers.time.latest());
              await vault.connect(signer).claimReward(tid, asset);
              ledger.claimReward(tid, asset, ts);
            }
          }
        } else if (action === 5) {
          // Fuzz Unselected Asset Zero-Delta Invariant
          const tid = (fuzz % 2) + 1;
          const isAct = await activation.isActivated(tid);
          if (isAct) {
            const chosen = await engine.getChosenAssets(tid);
            for (const a of assets) {
              if (!chosen.includes(a)) {
                const cl = await engine.getTotalClaimableReward(tid, a);
                expect(cl).to.equal(0n);
              }
            }
          }
        }
      }

      // Assert complete conservation
      const coll = await simulator.totalRevenueCollected();
      const conv = await simulator.totalRevenueConverted();
      const unconv = await simulator.unconvertedRevenue();
      expect(coll).to.equal(conv + unconv);
    });
  });

  describe("3. Security & Adversarial Attack Matrix", function () {
    it("should revert if fee generation is zero", async function () {
      await expect(simulator.connect(alice).generateFee("Zero Fee", 0)).to.be.revertedWithCustomError(
        simulator,
        "ZeroAmountNotAllowed"
      );
    });

    it("should revert if attempting to convert more revenue than unconverted balance", async function () {
      const unconv = await simulator.unconvertedRevenue();
      await expect(
        simulator.acquireRewardAsset(aaplAddr, unconv + 1000n, deployer.address)
      ).to.be.revertedWithCustomError(simulator, "InsufficientUnconvertedRevenue");
    });

    it("should prevent unauthorized users from acquiring rewards or withdrawing revenue", async function () {
      await expect(
        simulator.connect(attacker).acquireRewardAsset(aaplAddr, ethers.parseEther("10"), attacker.address)
      ).to.be.revertedWithCustomError(simulator, "OwnableUnauthorizedAccount");

      await expect(
        simulator.connect(attacker).withdrawRevenue(attacker.address, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(simulator, "OwnableUnauthorizedAccount");
    });

    it("should prevent unauthorized users from executing TBA transactions", async function () {
      await nft.mint(alice.address); // Token 1
      const tbaAddr = await vault.accountOf(1);

      // Create TBA
      await registry.createAccount(
        await accountImpl.getAddress(),
        SALT,
        connection.networkConfig.chainId,
        await nft.getAddress(),
        1
      );

      const tbaContract = await ethers.getContractAt("OohdiesAccount", tbaAddr);

      // Attacker attempts to call execute
      await expect(
        tbaContract.connect(attacker).execute(attacker.address, 0, "0x", 0)
      ).to.be.revertedWithCustomError(tbaContract, "NotAuthorized");
    });

    it("should atomically revert and roll back if RewardVault balance is insufficient on claim", async function () {
      await nft.mint(alice.address); // Token 1
      const picks = [aaplAddr, usdgAddr, tslaAddr];
      await banana.connect(alice).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(alice).activate(1, picks);

      // Fund EarningEngine ONLY (do not deposit backing to RewardVault)
      await aaplToken.approve(await engine.getAddress(), ethers.parseEther("50"));
      await engine.fundReward(aaplAddr, ethers.parseEther("50"), 7 * 86400);

      await networkHelpers.time.increase(86400); // 1 day of accrual

      const claimableBefore = await engine.getTotalClaimableReward(1, aaplAddr);
      expect(claimableBefore).to.be.gt(0n);

      // Claim should revert with InsufficientVaultBalance
      await expect(vault.connect(alice).claimReward(1, aaplAddr)).to.be.revertedWithCustomError(
        vault,
        "InsufficientVaultBalance"
      );

      // State is preserved and claimable is NOT wiped
      const claimableAfter = await engine.getTotalClaimableReward(1, aaplAddr);
      expect(claimableAfter).to.be.gte(claimableBefore);
    });
  });

  describe("4. TBA Multi-Cycle Balance Retention & Sales Continuity", function () {
    it("should allow NFT owner to withdraw from TBA to EOA, retain balances across cycles, and transfer ownership cleanly", async function () {
      await nft.mint(alice.address); // Token 1
      const tbaAddr = await vault.accountOf(1);

      // Create TBA
      await registry.createAccount(
        await accountImpl.getAddress(),
        SALT,
        connection.networkConfig.chainId,
        await nft.getAddress(),
        1
      );

      const tbaContract = await ethers.getContractAt("OohdiesAccount", tbaAddr);

      // Alice activates Token 1
      const picks = [aaplAddr, usdgAddr, tslaAddr];
      await banana.connect(alice).approve(await activation.getAddress(), ACTIVATION_COST);
      await activation.connect(alice).activate(1, picks);

      // Fund AAPLx stream + deposit backing
      await aaplToken.approve(await engine.getAddress(), ethers.parseEther("50"));
      await aaplToken.approve(await vault.getAddress(), ethers.parseEther("50"));
      await vault.depositReward(aaplAddr, ethers.parseEther("50"));
      await engine.fundReward(aaplAddr, ethers.parseEther("50"), 7 * 86400);

      await networkHelpers.time.increase(86400); // 1 day

      // 1. Claim AAPLx to TBA
      await vault.connect(alice).claimReward(1, aaplAddr);
      const tbaBal1 = await aaplToken.balanceOf(tbaAddr);
      expect(tbaBal1).to.be.gt(0n);

      // 2. Alice withdraws half from TBA to Alice EOA via execute
      const withdrawAmount = tbaBal1 / 2n;
      const transferData = aaplToken.interface.encodeFunctionData("transfer", [alice.address, withdrawAmount]);
      const aliceEoaBalBefore = await aaplToken.balanceOf(alice.address);

      await tbaContract.connect(alice).execute(aaplAddr, 0, transferData, 0);

      const aliceEoaBalAfter = await aaplToken.balanceOf(alice.address);
      expect(aliceEoaBalAfter - aliceEoaBalBefore).to.equal(withdrawAmount);
      expect(await aaplToken.balanceOf(tbaAddr)).to.equal(tbaBal1 - withdrawAmount);

      // 3. Alice transfers Token 1 to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);

      // 4. Alice attempts to withdraw remaining funds -> Reverts
      await expect(
        tbaContract.connect(alice).execute(aaplAddr, 0, transferData, 0)
      ).to.be.revertedWithCustomError(tbaContract, "NotAuthorized");

      // 5. Bob (new owner) withdraws remaining funds -> Success
      const bobTransferData = aaplToken.interface.encodeFunctionData("transfer", [bob.address, tbaBal1 - withdrawAmount]);
      const bobEoaBalBefore = await aaplToken.balanceOf(bob.address);

      await tbaContract.connect(bob).execute(aaplAddr, 0, bobTransferData, 0);

      const bobEoaBalAfter = await aaplToken.balanceOf(bob.address);
      expect(bobEoaBalAfter - bobEoaBalBefore).to.equal(tbaBal1 - withdrawAmount);
      expect(await aaplToken.balanceOf(tbaAddr)).to.equal(0n);
    });
  });
});
