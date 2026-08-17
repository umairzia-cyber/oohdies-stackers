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

  if (balanceBefore === 0n) {
    throw new Error("Deployer account has 0 ETH balance. Aborting deployment.");
  }

  if (net.chainId !== 46630n) {
    throw new Error(`Invalid Chain ID: expected 46630, got ${net.chainId}`);
  }

  const BANANA_ADDR = "0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1";
  const NFT_ADDR    = "0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A";

  // Protocol Standard: EXACTLY 100 BANANA per activation
  const ACTIVATION_COST = 100n * 10n ** 18n;
  const REQUIRED_PICKS = 3n;
  const COLLECTION_Q_MULTIPLIER = 20000n; // 2.0x in bps

  console.log("\n--- PRE-FLIGHT VALIDATION: CORE EXISTING CONTRACTS ---");

  // 1. Validate OohdiesNFT exists and deployer is owner
  const nftCode = await provider.getCode(NFT_ADDR);
  if (!nftCode || nftCode === "0x" || nftCode === "0x0") {
    throw new Error(`OohdiesNFT at ${NFT_ADDR} has no bytecode!`);
  }
  const nft = await ethers.getContractAt("OohdiesNFT", NFT_ADDR, deployer);
  const nftOwner = await nft.owner();
  console.log(`- OohdiesNFT (${NFT_ADDR}) verified. Owner: ${nftOwner}`);
  if (nftOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer ${deployer.address} is NOT the owner of OohdiesNFT (${nftOwner})!`);
  }

  // 2. Validate BananaToken exists
  const bananaCode = await provider.getCode(BANANA_ADDR);
  if (!bananaCode || bananaCode === "0x" || bananaCode === "0x0") {
    throw new Error(`BananaToken at ${BANANA_ADDR} has no bytecode!`);
  }
  console.log(`- BananaToken (${BANANA_ADDR}) verified.`);

  // 3. Validate ERC-6551 Registry exists
  const registryState = await ensureRegistry(provider);
  const registryCode = await provider.getCode(CANONICAL_REGISTRY);
  if (!registryCode || registryCode === "0x" || registryCode === "0x0") {
    throw new Error(`ERC6551Registry at ${CANONICAL_REGISTRY} has no bytecode!`);
  }
  console.log(`- ERC6551Registry (${CANONICAL_REGISTRY}) verified (${registryState}).`);

  // 4. Load and validate authoritative list of all 12 reward assets
  console.log("\n--- PRE-FLIGHT VALIDATION: ALL 12 REWARD ASSETS ---");
  const rawAssets = JSON.parse(fs.readFileSync("all_deployed_stocks.json", "utf8"));
  if (!Array.isArray(rawAssets) || rawAssets.length !== 12) {
    throw new Error(`all_deployed_stocks.json must contain exactly 12 assets! Found: ${rawAssets ? rawAssets.length : 0}`);
  }

  const seenAddresses = new Set();
  const seenSymbols = new Set();

  for (let i = 0; i < rawAssets.length; i++) {
    const asset = rawAssets[i];
    if (!asset.address || !ethers.isAddress(asset.address)) {
      throw new Error(`Asset #${i + 1} (${asset.symbol}) has invalid address: ${asset.address}`);
    }
    const lowerAddr = asset.address.toLowerCase();
    if (seenAddresses.has(lowerAddr)) {
      throw new Error(`DUPLICATE ASSET ADDRESS DETECTED: ${asset.address} (${asset.symbol})`);
    }
    seenAddresses.add(lowerAddr);

    if (seenSymbols.has(asset.symbol)) {
      throw new Error(`DUPLICATE ASSET SYMBOL DETECTED: ${asset.symbol}`);
    }
    seenSymbols.add(asset.symbol);

    const code = await provider.getCode(asset.address);
    if (!code || code === "0x" || code === "0x0") {
      throw new Error(`Asset ${asset.symbol} at ${asset.address} has NO BYTECODE on testnet!`);
    }

    const tokenContract = await ethers.getContractAt("MockRewardToken", asset.address, deployer);
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    if (symbol !== asset.symbol) {
      throw new Error(`Asset symbol mismatch on-chain: expected ${asset.symbol}, got ${symbol}`);
    }
    if (Number(decimals) !== Number(asset.decimals)) {
      throw new Error(`Asset decimals mismatch for ${asset.symbol}: expected ${asset.decimals}, got ${decimals}`);
    }

    console.log(`  [${(i + 1).toString().padStart(2)}/12] ${asset.symbol.padEnd(7)} @ ${asset.address} (Decimals: ${decimals}) -> VERIFIED`);
  }

  console.log("\n--- PRE-DEPLOYMENT SUMMARY ---");
  console.log(`Network:              ${net.name} (Chain ID: ${net.chainId})`);
  console.log(`Deployer:             ${deployer.address}`);
  console.log(`OohdiesNFT:           ${NFT_ADDR}`);
  console.log(`BananaToken:          ${BANANA_ADDR}`);
  console.log(`ERC6551Registry:      ${CANONICAL_REGISTRY}`);
  console.log(`Activation Cost:      100 BANANA (${ACTIVATION_COST.toString()} wei)`);
  console.log(`Required Stock Picks: ${REQUIRED_PICKS}`);
  console.log(`Reward Asset Count:   12 (all validated live on-chain)`);
  console.log(`Collection Q Mult:    2.0x (${COLLECTION_Q_MULTIPLIER} bps)`);

  console.log("\n--- STEP 1: DEPLOYING UPGRADED CORE CONTRACTS ---");

  // 1. Deploy ActivationController with exact 100 BANANA cost
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

  // 2. Deploy EarningEngine
  const EarningEngineFactory = await ethers.getContractFactory("EarningEngine");
  const newEngine = await EarningEngineFactory.deploy(
    newActivationAddr,
    NFT_ADDR,
    deployer.address
  );
  const newEngineReceipt = await newEngine.deploymentTransaction().wait();
  const newEngineAddr = await newEngine.getAddress();
  console.log(`2. New EarningEngine:        ${newEngineAddr} (Tx: ${newEngineReceipt.hash})`);

  // 3. Deploy OohdiesAccount Implementation (TBA target)
  const OohdiesAccountFactory = await ethers.getContractFactory("OohdiesAccount");
  const accountImpl = await OohdiesAccountFactory.deploy();
  const accountImplReceipt = await accountImpl.deploymentTransaction().wait();
  const accountImplAddr = await accountImpl.getAddress();
  console.log(`3. OohdiesAccount impl:     ${accountImplAddr} (Tx: ${accountImplReceipt.hash})`);

  // 4. Deploy RewardVault
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
  console.log(`4. New RewardVault:         ${newVaultAddr} (Tx: ${newVaultReceipt.hash})`);

  // 5. Deploy MockCollectionQ for testnet
  const MockCollectionQFactory = await ethers.getContractFactory("MockCollectionQ");
  const collectionQ = await MockCollectionQFactory.deploy(deployer.address);
  const collectionQReceipt = await collectionQ.deploymentTransaction().wait();
  const collectionQAddr = await collectionQ.getAddress();
  console.log(`5. Collection Q NFT:        ${collectionQAddr} (Tx: ${collectionQReceipt.hash})`);

  console.log("\n--- STEP 2: WIRING INTER-CONTRACT REFERENCES ---");

  const tx1 = await (await nft.setEarningEngine(newEngineAddr)).wait();
  console.log(`  - OohdiesNFT.setEarningEngine -> OK (Tx: ${tx1.hash})`);

  const tx2 = await (await nft.setActivationController(newActivationAddr)).wait();
  console.log(`  - OohdiesNFT.setActivationController -> OK (Tx: ${tx2.hash})`);

  const tx3 = await (await newActivation.setEarningEngine(newEngineAddr)).wait();
  console.log(`  - ActivationController.setEarningEngine -> OK (Tx: ${tx3.hash})`);

  const tx4 = await (await newEngine.setRewardVault(newVaultAddr)).wait();
  console.log(`  - EarningEngine.setRewardVault -> OK (Tx: ${tx4.hash})`);

  const tx5 = await (await newEngine.setFunder(deployer.address, true)).wait();
  console.log(`  - EarningEngine.setFunder(deployer) -> OK (Tx: ${tx5.hash})`);

  const tx6 = await (await newEngine.setCollectionQ(collectionQAddr, COLLECTION_Q_MULTIPLIER)).wait();
  console.log(`  - EarningEngine.setCollectionQ(2x) -> OK (Tx: ${tx6.hash})`);

  console.log("\n--- STEP 3: REGISTERING ALL 12 REWARD ASSETS ---");
  for (let i = 0; i < rawAssets.length; i++) {
    const asset = rawAssets[i];
    const regTx = await (await newEngine.registerRewardAsset(asset.address)).wait();
    console.log(`  [${(i + 1).toString().padStart(2)}/12] Registered ${asset.symbol.padEnd(7)} (${asset.address}) (Tx: ${regTx.hash})`);
  }

  console.log("\n--- STEP 4: STRICT POST-DEPLOYMENT ON-CHAIN VERIFICATION ---");

  // Verify Bytecode exists at all deployed addresses
  for (const [name, addr] of [
    ["ActivationController", newActivationAddr],
    ["EarningEngine", newEngineAddr],
    ["OohdiesAccount", accountImplAddr],
    ["RewardVault", newVaultAddr],
    ["MockCollectionQ", collectionQAddr],
  ]) {
    const code = await provider.getCode(addr);
    if (!code || code === "0x" || code === "0x0") {
      throw new Error(`FATAL: Deployed ${name} at ${addr} has NO BYTECODE!`);
    }
  }
  console.log("  - Bytecode verified at all 5 deployed contracts: OK");

  // Verify References
  const nftEngine = await nft.earningEngine();
  const nftActivation = await nft.activationController();
  const activationEngine = await newActivation.earningEngine();
  const engineVault = await newEngine.rewardVault();
  const engineColQ = await newEngine.collectionQ();
  const engineMult = await newEngine.collectionQMultiplierBps();
  const vaultEngine = await newVault.earningEngine();
  const vaultNft = await newVault.oohdiesNFT();
  const vaultRegistry = await newVault.registry();
  const vaultImpl = await newVault.accountImplementation();
  const isFunder = await newEngine.isFunder(deployer.address);

  if (nftEngine.toLowerCase() !== newEngineAddr.toLowerCase()) throw new Error("nft.earningEngine mismatch");
  if (nftActivation.toLowerCase() !== newActivationAddr.toLowerCase()) throw new Error("nft.activationController mismatch");
  if (activationEngine.toLowerCase() !== newEngineAddr.toLowerCase()) throw new Error("activation.earningEngine mismatch");
  if (engineVault.toLowerCase() !== newVaultAddr.toLowerCase()) throw new Error("engine.rewardVault mismatch");
  if (engineColQ.toLowerCase() !== collectionQAddr.toLowerCase()) throw new Error("engine.collectionQ mismatch");
  if (engineMult !== COLLECTION_Q_MULTIPLIER) throw new Error("engine.collectionQMultiplierBps mismatch");
  if (vaultEngine.toLowerCase() !== newEngineAddr.toLowerCase()) throw new Error("vault.earningEngine mismatch");
  if (vaultNft.toLowerCase() !== NFT_ADDR.toLowerCase()) throw new Error("vault.oohdiesNft mismatch");
  if (vaultRegistry.toLowerCase() !== CANONICAL_REGISTRY.toLowerCase()) throw new Error("vault.registry mismatch");
  if (vaultImpl.toLowerCase() !== accountImplAddr.toLowerCase()) throw new Error("vault.accountImplementation mismatch");
  if (!isFunder) throw new Error("engine.isFunder(deployer) is false");

  console.log("  - All inter-contract wiring verified: OK");

  // Verify Registration & Constants
  const registered = await newEngine.getRegisteredRewardAssets();
  if (registered.length !== 12) {
    throw new Error(`CRITICAL: EarningEngine has ${registered.length} registered assets, expected EXACTLY 12!`);
  }

  const registeredLower = registered.map(a => a.toLowerCase());
  for (const asset of rawAssets) {
    if (!registeredLower.includes(asset.address.toLowerCase())) {
      throw new Error(`CRITICAL: Expected asset ${asset.symbol} (${asset.address}) is NOT in registered assets!`);
    }
    const isReg = await newEngine.isRegisteredAsset(asset.address);
    if (!isReg) {
      throw new Error(`CRITICAL: isRegisteredAsset(${asset.address}) returned false!`);
    }
  }

  const actualActivationCost = await newActivation.activationCost();
  if (actualActivationCost !== ACTIVATION_COST) {
    throw new Error(`CRITICAL: ActivationController cost mismatch: expected ${ACTIVATION_COST}, got ${actualActivationCost}`);
  }

  const actualRequiredPicks = await newActivation.requiredPicks();
  if (actualRequiredPicks !== REQUIRED_PICKS) {
    throw new Error(`CRITICAL: ActivationController requiredPicks mismatch: expected ${REQUIRED_PICKS}, got ${actualRequiredPicks}`);
  }

  console.log(`  - Exact 12 assets registered: OK`);
  console.log(`  - Activation Cost = 100 BANANA: OK`);
  console.log(`  - Required Picks = 3: OK`);
  console.log(`  - Collection Q Multiplier = 2.0x (20,000 bps): OK`);

  console.log("\n--- STEP 5: MINTING & FUNDING REWARD EMISSIONS ---");
  const duration = 7200n; // 2 hours

  for (let i = 0; i < rawAssets.length; i++) {
    const asset = rawAssets[i];
    const token = await ethers.getContractAt("MockRewardToken", asset.address, deployer);
    const base = asset.symbol === "USDG" ? 10_000n : 1_000n;
    const amount = base * 10n ** BigInt(asset.decimals);

    // Twice over: the engine's accounting and the vault's actual balance fund independently.
    await (await token.mint(deployer.address, amount * 2n)).wait();

    await (await token.approve(newEngineAddr, amount)).wait();
    await (await newEngine.fundReward(asset.address, amount, duration)).wait();

    await (await token.approve(newVaultAddr, amount)).wait();
    await (await newVault.depositReward(asset.address, amount)).wait();

    const vaultBalance = await token.balanceOf(newVaultAddr);
    if (vaultBalance < amount) {
      throw new Error(`RewardVault balance for ${asset.symbol} is ${vaultBalance}, expected at least ${amount}!`);
    }

    console.log(`  [${(i + 1).toString().padStart(2)}/12] ${asset.symbol.padEnd(7)} funded ${base} tokens over ${duration}s, Vault verified`);
  }

  console.log("\n==================================================");
  console.log("DEPLOYMENT UPGRADE & INITIALIZATION FULLY VERIFIED");
  console.log("==================================================");
  console.log(`BananaToken:          ${BANANA_ADDR}`);
  console.log(`OohdiesNFT:           ${NFT_ADDR}`);
  console.log(`ActivationController: ${newActivationAddr}`);
  console.log(`EarningEngine:        ${newEngineAddr}`);
  console.log(`RewardVault:          ${newVaultAddr}`);
  console.log(`ERC6551Registry:      ${CANONICAL_REGISTRY}`);
  console.log(`OohdiesAccount impl:  ${accountImplAddr}`);
  console.log(`Collection Q NFT:     ${collectionQAddr}`);
  console.log("\nRegistered Stocks:");
  for (const asset of rawAssets) {
    console.log(`  - ${(asset.symbol + ":").padEnd(10)} ${asset.address} (Decimals: ${asset.decimals})`);
  }

  const balanceAfter = await provider.getBalance(deployer.address);
  console.log(`\nDeployer Final Balance: ${ethers.formatEther(balanceAfter)} ETH`);
  console.log(`ETH Spent:              ${ethers.formatEther(balanceBefore - balanceAfter)} ETH`);
}

main().catch((err) => {
  console.error("Upgrade error:", err);
  process.exitCode = 1;
});
