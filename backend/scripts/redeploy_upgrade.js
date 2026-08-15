import fs from "fs";
import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();
  console.log("==================================================");
  console.log("ROBINHOOD CHAIN TESTNET — PROTOCOL VERSION UPGRADE");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const net = await provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network Name:    ", net.name);
  console.log("Chain ID:        ", net.chainId.toString());

  const balanceBefore = await provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balanceBefore), "ETH");

  if (net.chainId !== 46630n) {
    throw new Error(`Invalid Chain ID: expected 46630, got ${net.chainId}`);
  }

  const BANANA_ADDR = "0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1";
  const NFT_ADDR    = "0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A";
  const USDG_ADDR   = "0xF25905f4ba33706ab2C064da2e786bc33d21cf0f";
  const AAPL_ADDR   = "0xd38EAB6b104950b0443d3c6FB432e89631BDbC88";
  const ACTIVATION_COST = 1_000n * 10n ** 18n;

  console.log("\n--- STEP 1: DEPLOYING CORRECTED CORE CONTRACTS ---");

  const ActivationControllerFactory = await ethers.getContractFactory("ActivationController");
  const newActivation = await ActivationControllerFactory.deploy(
    NFT_ADDR,
    BANANA_ADDR,
    deployer.address,
    ACTIVATION_COST
  );
  const newActivationReceipt = await newActivation.deploymentTransaction().wait();
  const newActivationAddr = await newActivation.getAddress();
  console.log(`1. New ActivationController: ${newActivationAddr} (Tx: ${newActivationReceipt.hash})`);

  const EarningEngineFactory = await ethers.getContractFactory("EarningEngine");
  const newEngine = await EarningEngineFactory.deploy(
    newActivationAddr,
    NFT_ADDR,
    deployer.address
  );
  const newEngineReceipt = await newEngine.deploymentTransaction().wait();
  const newEngineAddr = await newEngine.getAddress();
  console.log(`2. New EarningEngine:        ${newEngineAddr} (Tx: ${newEngineReceipt.hash})`);

  const RewardVaultFactory = await ethers.getContractFactory("RewardVault");
  const newVault = await RewardVaultFactory.deploy(
    NFT_ADDR,
    newEngineAddr,
    deployer.address
  );
  const newVaultReceipt = await newVault.deploymentTransaction().wait();
  const newVaultAddr = await newVault.getAddress();
  console.log(`3. New RewardVault:         ${newVaultAddr} (Tx: ${newVaultReceipt.hash})`);

  console.log("\n--- STEP 2: WIRING INTER-CONTRACT REFERENCES ---");

  const nft = await ethers.getContractAt("OohdiesNFT", NFT_ADDR, deployer);

  const tx1 = await nft.setEarningEngine(newEngineAddr);
  await tx1.wait();
  console.log("  - OohdiesNFT.setEarningEngine -> OK");

  const tx2 = await nft.setActivationController(newActivationAddr);
  await tx2.wait();
  console.log("  - OohdiesNFT.setActivationController -> OK");

  const tx3 = await newActivation.setEarningEngine(newEngineAddr);
  await tx3.wait();
  console.log("  - ActivationController.setEarningEngine -> OK");

  const tx4 = await newEngine.setRewardVault(newVaultAddr);
  await tx4.wait();
  console.log("  - EarningEngine.setRewardVault -> OK");

  const tx5 = await newEngine.setFunder(deployer.address, true);
  await tx5.wait();
  console.log("  - EarningEngine.setFunder(deployer) -> OK");

  const tx6 = await newEngine.registerRewardAsset(USDG_ADDR);
  await tx6.wait();
  console.log("  - EarningEngine.registerRewardAsset(USDG) -> OK");

  const tx7 = await newEngine.registerRewardAsset(AAPL_ADDR);
  await tx7.wait();
  console.log("  - EarningEngine.registerRewardAsset(AAPLx) -> OK");

  console.log("\n--- STEP 3: MINTING & FUNDING REWARD EMISSIONS ---");
  const usdg = await ethers.getContractAt("MockRewardToken", USDG_ADDR, deployer);
  const aapl = await ethers.getContractAt("MockRewardToken", AAPL_ADDR, deployer);

  const usdgAmount = 10_000n * 10n ** 6n;
  const aaplAmount = 1_000n * 10n ** 18n;
  const duration   = 3600n;

  const mintUsdgTx = await usdg.mint(deployer.address, usdgAmount * 2n);
  await mintUsdgTx.wait();
  const mintAaplTx = await aapl.mint(deployer.address, aaplAmount * 2n);
  await mintAaplTx.wait();

  await (await usdg.approve(newEngineAddr, usdgAmount)).wait();
  await (await newEngine.fundReward(USDG_ADDR, usdgAmount, duration)).wait();
  console.log("  - USDG Engine Funded -> OK");

  await (await aapl.approve(newEngineAddr, aaplAmount)).wait();
  await (await newEngine.fundReward(AAPL_ADDR, aaplAmount, duration)).wait();
  console.log("  - AAPLx Engine Funded -> OK");

  await (await usdg.approve(newVaultAddr, usdgAmount)).wait();
  await (await newVault.depositReward(USDG_ADDR, usdgAmount)).wait();
  console.log("  - USDG Vault Deposited -> OK");

  await (await aapl.approve(newVaultAddr, aaplAmount)).wait();
  await (await newVault.depositReward(AAPL_ADDR, aaplAmount)).wait();
  console.log("  - AAPLx Vault Deposited -> OK");

  console.log("\n==================================================");
  console.log("DEPLOYMENT UPGRADE & INITIALIZATION COMPLETE");
  console.log("==================================================");
  console.log(`BananaToken:          ${BANANA_ADDR}`);
  console.log(`OohdiesNFT:           ${NFT_ADDR}`);
  console.log(`ActivationController: ${newActivationAddr}`);
  console.log(`EarningEngine:        ${newEngineAddr}`);
  console.log(`RewardVault:          ${newVaultAddr}`);
  console.log(`Mock USDG:            ${USDG_ADDR}`);
  console.log(`Mock AAPLx:           ${AAPL_ADDR}`);

  const balanceAfter = await provider.getBalance(deployer.address);
  console.log(`\nDeployer Final Balance: ${ethers.formatEther(balanceAfter)} ETH`);
  console.log(`ETH Spent:              ${ethers.formatEther(balanceBefore - balanceAfter)} ETH`);
}

main().catch((err) => {
  console.error("Upgrade error:", err);
  process.exitCode = 1;
});
