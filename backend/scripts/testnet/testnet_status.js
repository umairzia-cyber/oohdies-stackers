import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  EXPECTED_ACTIVATION_COST,
  EXPECTED_REQUIRED_PICKS,
  EXPECTED_ASSET_COUNT,
  COLLECTION_Q_MULTIPLIER_BPS,
  ACTIVE_DEPLOYED_CONTRACTS,
  getTestnetProvider,
  assertTestnetNetwork,
  loadAllRewardAssets,
  getAllTestnetContracts,
  getTestnetContract,
  predictAccount,
} from "../../lib/testnet_config.js";
import { getTestWallets, getWalletBalances } from "../../lib/testnet_wallets.js";

export async function checkTestnetStatus(customProvider = null) {
  console.log("==================================================");
  console.log("ROBINHOOD CHAIN TESTNET — ENVIRONMENT STATUS");
  console.log("==================================================");

  const provider = customProvider || getTestnetProvider();
  let hasFailure = false;

  // 1. NETWORK
  console.log("\nNETWORK");
  try {
    const net = await assertTestnetNetwork(provider);
    console.log(`PASS — ${net.name}`);
    console.log(`Chain ID: ${net.chainId.toString()}`);
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Network check failed: ${err.message}`);
  }

  // 2. CONTRACTS
  console.log("\nCONTRACTS");
  const contractList = [
    { name: "BananaToken", address: ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN },
    { name: "OohdiesNFT", address: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT },
    { name: "ActivationController", address: ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER },
    { name: "EarningEngine", address: ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE },
    { name: "RewardVault", address: ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT },
    { name: "ERC6551Registry", address: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY },
    { name: "OohdiesAccount", address: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL },
    { name: "MockCollectionQ", address: ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q },
  ];

  for (const c of contractList) {
    try {
      const code = await provider.getCode(c.address);
      if (!code || code === "0x" || code === "0x0") {
        hasFailure = true;
        console.log(`FAIL — ${c.name} (${c.address}) has NO bytecode`);
      } else {
        console.log(`PASS — ${c.name.padEnd(20)} (${c.address})`);
      }
    } catch (err) {
      hasFailure = true;
      console.log(`FAIL — ${c.name}: ${err.message}`);
    }
  }

  // Load contracts
  const { nft, banana, activation, engine, vault, colQ } = getAllTestnetContracts(provider);

  // 3. CONTRACT WIRING
  console.log("\nCONTRACT WIRING");
  try {
    const nftEngine = await nft.earningEngine();
    const nftActivation = await nft.activationController();
    const activationEngine = await activation.earningEngine();
    const engineVault = await engine.rewardVault();
    const engineColQ = await engine.collectionQ();
    const vaultEngine = await vault.earningEngine();
    const vaultNFT = await vault.oohdiesNFT();
    const vaultRegistry = await vault.registry();
    const vaultImpl = await vault.accountImplementation();

    const wiringOk =
      nftEngine.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase() &&
      nftActivation.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER.toLowerCase() &&
      activationEngine.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase() &&
      engineVault.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT.toLowerCase() &&
      engineColQ.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q.toLowerCase() &&
      vaultEngine.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase() &&
      vaultNFT.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT.toLowerCase() &&
      vaultRegistry.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY.toLowerCase() &&
      vaultImpl.toLowerCase() === ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL.toLowerCase();

    if (wiringOk) {
      console.log("PASS — All inter-contract references correctly wired");
    } else {
      hasFailure = true;
      console.log("FAIL — Inter-contract wiring reference mismatch");
    }
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Wiring query failed: ${err.message}`);
  }

  // 4. REWARD ASSETS
  console.log("\nREWARD ASSETS");
  try {
    const rewardAssets = loadAllRewardAssets();
    const registered = await engine.getRegisteredRewardAssets();
    if (registered.length === EXPECTED_ASSET_COUNT && rewardAssets.length === EXPECTED_ASSET_COUNT) {
      console.log(`PASS — ${registered.length}/${EXPECTED_ASSET_COUNT} registered`);
    } else {
      hasFailure = true;
      console.log(`FAIL — Found ${registered.length} registered, expected ${EXPECTED_ASSET_COUNT}`);
    }
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Reward assets check failed: ${err.message}`);
  }

  // 5. ECONOMICS
  console.log("\nECONOMICS");
  try {
    const cost = await activation.activationCost();
    if (BigInt(cost) === EXPECTED_ACTIVATION_COST) {
      console.log(`PASS — activation cost = 100 BANANA (${ethers.formatEther(cost)} tokens)`);
    } else {
      hasFailure = true;
      console.log(`FAIL — activation cost mismatch: ${ethers.formatEther(cost)} BANANA`);
    }
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Economics check failed: ${err.message}`);
  }

  // 6. REWARD CONFIGURATION
  console.log("\nREWARD CONFIGURATION");
  try {
    const rewardAssets = loadAllRewardAssets();
    let allReadable = true;
    for (const asset of rewardAssets) {
      const isReg = await engine.isRegisteredAsset(asset.address);
      const info = await engine.rewardAssets(asset.address);
      if (!isReg || info.rewardRate === 0n) {
        allReadable = false;
        break;
      }
    }
    if (allReadable) {
      console.log("PASS — assets configured");
      console.log("PASS — reward periods and rates readable");
    } else {
      hasFailure = true;
      console.log("FAIL — Some assets have unconfigured reward streams");
    }
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Reward configuration failed: ${err.message}`);
  }

  // 7. ERC-6551
  console.log("\nERC-6551");
  try {
    const regCode = await provider.getCode(ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY);
    const implCode = await provider.getCode(ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL);
    const tba1 = await vault.accountOf(1);
    const predicted1 = predictAccount({
      implementation: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL,
      tokenContract: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT,
      tokenId: 1,
      chainId: ROBINHOOD_TESTNET_CHAIN_ID,
      registry: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY,
    });

    if (regCode && regCode !== "0x") {
      console.log("PASS — registry bytecode");
    } else {
      hasFailure = true;
      console.log("FAIL — registry bytecode missing");
    }

    if (implCode && implCode !== "0x") {
      console.log("PASS — account implementation");
    } else {
      hasFailure = true;
      console.log("FAIL — account implementation bytecode missing");
    }

    if (tba1.toLowerCase() === predicted1.toLowerCase()) {
      console.log("PASS — deterministic TBA derivation");
    } else {
      hasFailure = true;
      console.log("FAIL — deterministic TBA derivation mismatch");
    }
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — ERC-6551 check failed: ${err.message}`);
  }

  // 8. WALLETS
  console.log("\nWALLETS");
  try {
    const wallets = getTestWallets(provider);
    if (wallets.deployer) {
      const depBal = await provider.getBalance(wallets.deployer.address);
      console.log(`PASS — Deployer gas balance: ${ethers.formatEther(depBal)} ETH (${wallets.deployer.address})`);
    } else {
      console.log("INFO — Deployer not configured in environment");
    }
    const aliceBal = await provider.getBalance(wallets.alice.address);
    console.log(`PASS — Alice gas balance: ${ethers.formatEther(aliceBal)} ETH (${wallets.alice.address})`);

    const bobBal = await provider.getBalance(wallets.bob.address);
    console.log(`PASS — Bob gas balance: ${ethers.formatEther(bobBal)} ETH (${wallets.bob.address})`);

    const attackerBal = await provider.getBalance(wallets.attacker.address);
    console.log(`PASS — Attacker gas balance: ${ethers.formatEther(attackerBal)} ETH (${wallets.attacker.address})`);
  } catch (err) {
    hasFailure = true;
    console.log(`FAIL — Wallets query failed: ${err.message}`);
  }

  console.log("\n==================================================");
  if (!hasFailure) {
    console.log("FINAL RESULT:\nTESTNET INFRASTRUCTURE VERIFIED");
    console.log("==================================================");
    return true;
  } else {
    console.log("FINAL RESULT:\nTESTNET INFRASTRUCTURE FAILED");
    console.log("==================================================");
    throw new Error("Testnet infrastructure verification failed.");
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  checkTestnetStatus().catch((err) => {
    process.exit(1);
  });
}
