import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  ROBINHOOD_TESTNET_RPC,
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

export async function runVerification(customProvider = null) {
  console.log("================================================================================");
  console.log("🔍 ROBINHOOD CHAIN TESTNET — DEPLOYMENT & PROTOCOL VERIFICATION");
  console.log("================================================================================");

  const provider = customProvider || getTestnetProvider();

  // 1. STRICT NETWORK SAFETY ASSERTION
  console.log("\n[1/7] Network Safety Assertion...");
  const net = await assertTestnetNetwork(provider);
  console.log(`  ✓ Connected to: ${net.name} (Chain ID: ${net.chainId.toString()})`);

  // 2. CORE CONTRACT BYTECODE VERIFICATION
  console.log("\n[2/7] Core Contract Bytecode Verification...");
  const coreContracts = [
    { name: "BananaToken", address: ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN },
    { name: "OohdiesNFT", address: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT },
    { name: "ActivationController", address: ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER },
    { name: "EarningEngine", address: ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE },
    { name: "RewardVault", address: ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT },
    { name: "ERC6551Registry", address: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY },
    { name: "OohdiesAccountImpl", address: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL },
    { name: "MockCollectionQ", address: ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q },
  ];

  for (const c of coreContracts) {
    if (!c.address || !ethers.isAddress(c.address)) {
      throw new Error(`CRITICAL: Invalid address for ${c.name}: ${c.address}`);
    }
    const code = await provider.getCode(c.address);
    if (!code || code === "0x" || code === "0x0") {
      throw new Error(`CRITICAL: No bytecode deployed at ${c.name} address (${c.address})!`);
    }
    console.log(`  ✓ ${c.name.padEnd(22)} @ ${c.address} (${(code.length / 2 - 1)} bytes bytecode)`);
  }

  // Load contract instances
  const { nft, banana, activation, engine, vault, colQ } = getAllTestnetContracts(provider);

  // 3. ARCHITECTURE & CONTRACT WIRING
  console.log("\n[3/7] Inter-Contract Wiring & References...");
  const nftEngine = await nft.earningEngine();
  const nftActivation = await nft.activationController();
  const activationEngine = await activation.earningEngine();
  const activationNFT = await activation.oohdiesNFT();
  const activationBanana = await activation.bananaToken();
  const engineVault = await engine.rewardVault();
  const engineNFT = await engine.oohdiesNFT();
  const engineActivation = await engine.activationController();
  const engineColQ = await engine.collectionQ();
  const engineMult = await engine.collectionQMultiplierBps();
  const vaultEngine = await vault.earningEngine();
  const vaultNFT = await vault.oohdiesNFT();
  const vaultRegistry = await vault.registry();
  const vaultImpl = await vault.accountImplementation();

  if (nftEngine.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase()) {
    throw new Error(`OohdiesNFT.earningEngine mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE}, got ${nftEngine}`);
  }
  if (nftActivation.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER.toLowerCase()) {
    throw new Error(`OohdiesNFT.activationController mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER}, got ${nftActivation}`);
  }
  if (activationEngine.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase()) {
    throw new Error(`ActivationController.earningEngine mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE}, got ${activationEngine}`);
  }
  if (activationNFT.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT.toLowerCase()) {
    throw new Error(`ActivationController.oohdiesNFT mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT}, got ${activationNFT}`);
  }
  if (activationBanana.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN.toLowerCase()) {
    throw new Error(`ActivationController.bananaToken mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN}, got ${activationBanana}`);
  }
  if (engineVault.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT.toLowerCase()) {
    throw new Error(`EarningEngine.rewardVault mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT}, got ${engineVault}`);
  }
  if (engineNFT.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT.toLowerCase()) {
    throw new Error(`EarningEngine.oohdiesNFT mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT}, got ${engineNFT}`);
  }
  if (engineActivation.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER.toLowerCase()) {
    throw new Error(`EarningEngine.activationController mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER}, got ${engineActivation}`);
  }
  if (engineColQ.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q.toLowerCase()) {
    throw new Error(`EarningEngine.collectionQ mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q}, got ${engineColQ}`);
  }
  if (BigInt(engineMult) !== COLLECTION_Q_MULTIPLIER_BPS) {
    throw new Error(`EarningEngine.collectionQMultiplierBps mismatch: expected ${COLLECTION_Q_MULTIPLIER_BPS}, got ${engineMult}`);
  }
  if (vaultEngine.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE.toLowerCase()) {
    throw new Error(`RewardVault.earningEngine mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE}, got ${vaultEngine}`);
  }
  if (vaultNFT.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT.toLowerCase()) {
    throw new Error(`RewardVault.oohdiesNFT mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT}, got ${vaultNFT}`);
  }
  if (vaultRegistry.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY.toLowerCase()) {
    throw new Error(`RewardVault.registry mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY}, got ${vaultRegistry}`);
  }
  if (vaultImpl.toLowerCase() !== ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL.toLowerCase()) {
    throw new Error(`RewardVault.accountImplementation mismatch: expected ${ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL}, got ${vaultImpl}`);
  }

  console.log("  ✓ All 14 inter-contract references & cross-wirings strictly verified.");

  // 4. VERIFY ALL 12 REWARD ASSETS & REGISTRATION
  console.log("\n[4/7] 12 Stock Reward Assets Verification...");
  const rewardAssets = loadAllRewardAssets();
  const registeredOnChain = await engine.getRegisteredRewardAssets();

  if (registeredOnChain.length !== EXPECTED_ASSET_COUNT) {
    throw new Error(
      `CRITICAL DEPLOYMENT SAFETY FAILURE: EarningEngine has ${registeredOnChain.length} registered assets, required EXACTLY ${EXPECTED_ASSET_COUNT}!`
    );
  }

  const reqPicks = await activation.requiredPicks();
  if (BigInt(reqPicks) !== EXPECTED_REQUIRED_PICKS) {
    throw new Error(`ActivationController.requiredPicks mismatch: expected ${EXPECTED_REQUIRED_PICKS}, got ${reqPicks}`);
  }
  if (BigInt(registeredOnChain.length) < reqPicks) {
    throw new Error(`SAFETY INVARIANT VIOLATION: Registered assets (${registeredOnChain.length}) < requiredPicks (${reqPicks})`);
  }

  for (let i = 0; i < rewardAssets.length; i++) {
    const asset = rewardAssets[i];
    const isReg = await engine.isRegisteredAsset(asset.address);
    if (!isReg) {
      throw new Error(`Reward asset ${asset.symbol} (${asset.address}) is NOT registered in EarningEngine!`);
    }

    const tokenContract = getTestnetContract("MockRewardToken", asset.address, provider);
    const code = await provider.getCode(asset.address);
    if (!code || code === "0x" || code === "0x0") {
      throw new Error(`Asset ${asset.symbol} @ ${asset.address} has NO BYTECODE!`);
    }

    const onChainDecimals = await tokenContract.decimals();
    if (Number(onChainDecimals) !== Number(asset.decimals)) {
      throw new Error(`Asset ${asset.symbol} decimals mismatch: expected ${asset.decimals}, got ${onChainDecimals}`);
    }

    const assetInfo = await engine.rewardAssets(asset.address);
    const vaultBal = await tokenContract.balanceOf(ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT);

    console.log(
      `  ✓ [${(i + 1).toString().padStart(2)}/12] ${asset.symbol.padEnd(7)} @ ${asset.address} | Dec: ${onChainDecimals.toString().padStart(2)} | Rate: ${assetInfo.rewardRate.toString().padEnd(16)} | Finish: ${assetInfo.periodFinish.toString().padEnd(10)} | Vault: ${ethers.formatUnits(vaultBal, onChainDecimals)}`
    );
  }

  // 5. ACTIVATION ECONOMICS
  console.log("\n[5/7] Activation Economics & Invariants...");
  const onChainCost = await activation.activationCost();
  console.log(`  - On-chain Activation Cost: ${ethers.formatEther(onChainCost)} BANANA (${onChainCost.toString()} wei)`);
  if (BigInt(onChainCost) !== EXPECTED_ACTIVATION_COST) {
    throw new Error(
      `FATAL ECONOMICS VIOLATION: Activation cost is ${ethers.formatEther(onChainCost)} BANANA, required EXACTLY 100 BANANA (${EXPECTED_ACTIVATION_COST.toString()} wei)!`
    );
  }
  console.log("  ✓ Activation cost strictly verified at exactly 100 BANANA.");

  // 6. ERC-6551 DETERMINISTIC TBA DERIVATION
  console.log("\n[6/7] ERC-6551 Registry & TBA Derivation...");
  const totalMinted = await nft.totalMinted();
  console.log(`  - Oohdies Total Minted on testnet: ${totalMinted.toString()}`);

  const testTokenIds = totalMinted > 0n ? [1n, BigInt(totalMinted)] : [1n, 2n];
  for (const tid of testTokenIds) {
    const onChainTBA = await vault.accountOf(tid);
    const predictedTBA = predictAccount({
      implementation: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL,
      tokenContract: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT,
      tokenId: tid,
      chainId: ROBINHOOD_TESTNET_CHAIN_ID,
      registry: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY,
    });

    if (onChainTBA.toLowerCase() !== predictedTBA.toLowerCase()) {
      throw new Error(
        `TBA derivation drift for Token #${tid}: on-chain RewardVault returned ${onChainTBA}, offline predictAccount computed ${predictedTBA}`
      );
    }
    console.log(`  ✓ Token #${tid.toString().padEnd(2)} TBA: ${onChainTBA} (Matches offline CREATE2 derivation)`);
  }

  // 7. TEST WALLET AUDIT
  console.log("\n[7/7] Test Wallet Infrastructure Status...");
  const wallets = getTestWallets(provider);
  console.log(`  - Deployer: ${wallets.deployer ? wallets.deployer.address : "Not configured in env"}`);
  if (wallets.deployer) {
    const depBal = await getWalletBalances({
      address: wallets.deployer.address,
      provider,
      bananaAddress: ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN,
      nftAddress: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT,
    });
    console.log(`    ETH Gas: ${depBal.formattedEth} ETH | BANANA: ${depBal.formattedBanana} | Oohdies: ${depBal.nftBalance.toString()}`);
  }
  console.log(`  - Alice:    ${wallets.alice.address} (Configured: ${wallets.hasConfiguredAlice})`);
  console.log(`  - Bob:      ${wallets.bob.address} (Configured: ${wallets.hasConfiguredBob})`);
  console.log(`  - Attacker: ${wallets.attacker.address} (Configured: ${wallets.hasConfiguredAttacker})`);

  console.log("\n================================================================================");
  console.log("🎉 ALL DEPLOYMENT & PROTOCOL INVARIANTS FULLY VERIFIED ON ROBINHOOD TESTNET!");
  console.log("================================================================================");

  return true;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  runVerification().catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:");
    console.error(err);
    process.exit(1);
  });
}
