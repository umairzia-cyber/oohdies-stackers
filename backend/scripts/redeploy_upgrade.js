import fs from "fs";
import hre from "hardhat";
import { CANONICAL_REGISTRY, ZERO_SALT, ensureRegistry } from "../lib/erc6551.js";

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
  // Keep this in step with the copy in MyStack.tsx, which currently tells users 100 $BANANA.
  const ACTIVATION_COST = 1_000n * 10n ** 18n;

  // Every asset a user can pick has to be registered on the NEW engine — registration is engine
  // storage and does not survive a redeploy. Activation now requires `requiredPicks` distinct
  // registered assets, so missing any of these makes activation impossible rather than merely
  // reducing rewards.
  const REWARD_ASSETS = JSON.parse(fs.readFileSync("all_deployed_stocks.json", "utf8"));
  if (REWARD_ASSETS.length === 0) throw new Error("all_deployed_stocks.json is empty");

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

  // The registry already exists on Robinhood testnet; this is a no-op there.
  const registryState = await ensureRegistry(provider);
  console.log(`   ERC6551Registry:         ${CANONICAL_REGISTRY} (${registryState})`);

  const OohdiesAccountFactory = await ethers.getContractFactory("OohdiesAccount");
  const accountImpl = await OohdiesAccountFactory.deploy();
  await accountImpl.deploymentTransaction().wait();
  const accountImplAddr = await accountImpl.getAddress();
  console.log(`   OohdiesAccount impl:     ${accountImplAddr}`);
  console.log("   NOTE: this address fixes every wallet address. Redeploying it relocates all 1,111.");

  const RewardVaultFactory = await ethers.getContractFactory("RewardVault");
  const newVault = await RewardVaultFactory.deploy(
    NFT_ADDR,
    newEngineAddr,
    deployer.address,
    CANONICAL_REGISTRY,
    accountImplAddr,
    ZERO_SALT
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

  for (const asset of REWARD_ASSETS) {
    await (await newEngine.registerRewardAsset(asset.address)).wait();
    console.log(`  - registerRewardAsset(${asset.symbol}) -> OK`);
  }

  const registered = await newEngine.getRegisteredRewardAssets();
  const requiredPicks = await newActivation.requiredPicks();
  if (registered.length < Number(requiredPicks)) {
    throw new Error(
      `Only ${registered.length} assets registered but activation requires ${requiredPicks} picks`
    );
  }
  console.log(`  - ${registered.length} assets registered, requiredPicks = ${requiredPicks}`);

  console.log("\n--- STEP 3: MINTING & FUNDING REWARD EMISSIONS ---");
  const duration = 3600n;

  for (const asset of REWARD_ASSETS) {
    const token = await ethers.getContractAt("MockRewardToken", asset.address, deployer);
    const base = asset.symbol === "USDG" ? 10_000n : 1_000n;
    const amount = base * 10n ** BigInt(asset.decimals);

    // Twice over: the engine's accounting and the vault's actual balance fund independently.
    await (await token.mint(deployer.address, amount * 2n)).wait();

    await (await token.approve(newEngineAddr, amount)).wait();
    await (await newEngine.fundReward(asset.address, amount, duration)).wait();

    await (await token.approve(newVaultAddr, amount)).wait();
    await (await newVault.depositReward(asset.address, amount)).wait();

    console.log(`  - ${asset.symbol.padEnd(7)} funded ${base} over ${duration}s, vault deposited`);
  }

  console.log("\n==================================================");
  console.log("DEPLOYMENT UPGRADE & INITIALIZATION COMPLETE");
  console.log("==================================================");
  console.log(`BananaToken:          ${BANANA_ADDR}`);
  console.log(`OohdiesNFT:           ${NFT_ADDR}`);
  console.log(`ActivationController: ${newActivationAddr}`);
  console.log(`EarningEngine:        ${newEngineAddr}`);
  console.log(`RewardVault:          ${newVaultAddr}`);
  console.log(`ERC6551Registry:      ${CANONICAL_REGISTRY}`);
  console.log(`OohdiesAccount impl:  ${accountImplAddr}`);
  for (const asset of REWARD_ASSETS) {
    console.log(`${(asset.symbol + ":").padEnd(22)}${asset.address}`);
  }

  const balanceAfter = await provider.getBalance(deployer.address);
  console.log(`\nDeployer Final Balance: ${ethers.formatEther(balanceAfter)} ETH`);
  console.log(`ETH Spent:              ${ethers.formatEther(balanceBefore - balanceAfter)} ETH`);
}

main().catch((err) => {
  console.error("Upgrade error:", err);
  process.exitCode = 1;
});
