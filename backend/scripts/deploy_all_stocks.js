import fs from "fs";
import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();
  console.log("==================================================");
  console.log("ROBINHOOD CHAIN TESTNET — DEPLOYING FULL STOCK SUITE");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const net = await provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network Name:    ", net.name);
  console.log("Chain ID:        ", net.chainId.toString());

  if (net.chainId !== 46630n) {
    throw new Error(`Invalid Chain ID: expected 46630, got ${net.chainId}`);
  }

  const ACTIVATION_ADDR = "0xF5c391a42876a67007860c95a3FEaD6d6529Bf31";
  const ENGINE_ADDR     = "0xEAe891a47256dD688e6dc0C438Df313eE62c39Dc";
  const VAULT_ADDR      = "0x1A417a1bF0Cfd4c38bd3FB13B5EF81B45D2D1fF0";
  const USDG_ADDR       = "0xF25905f4ba33706ab2C064da2e786bc33d21cf0f";
  const AAPL_ADDR       = "0xd38EAB6b104950b0443d3c6FB432e89631BDbC88";

  const activation = await ethers.getContractAt("ActivationController", ACTIVATION_ADDR, deployer);
  const engine     = await ethers.getContractAt("EarningEngine", ENGINE_ADDR, deployer);
  const vault      = await ethers.getContractAt("RewardVault", VAULT_ADDR, deployer);

  console.log("\n--- STEP 1: UPDATING ACTIVATION COST TO 100 BANANA ---");
  const newCost = 100n * 10n ** 18n;
  const setCostTx = await activation.setActivationCost(newCost);
  await setCostTx.wait();
  console.log(`Activation cost updated to: 100 BANANA (Tx: ${setCostTx.hash})`);

  console.log("\n--- STEP 2: DEPLOYING 10 ADDITIONAL STOCK TOKENS ---");
  const MockFactory = await ethers.getContractFactory("MockRewardToken");

  const stockConfigs = [
    { id: "tsla", name: "Tesla Stock", symbol: "TSLAx", decimals: 18, icon: "⚡" },
    { id: "nvda", name: "Nvidia Stock", symbol: "NVDAx", decimals: 18, icon: "🟩" },
    { id: "msft", name: "Microsoft Stock", symbol: "MSFTx", decimals: 18, icon: "🪟" },
    { id: "amzn", name: "Amazon Stock", symbol: "AMZNx", decimals: 18, icon: "📦" },
    { id: "googl", name: "Google Stock", symbol: "GOOGLx", decimals: 18, icon: "🔍" },
    { id: "meta", name: "Meta Stock", symbol: "METAx", decimals: 18, icon: "♾️" },
    { id: "pltr", name: "Palantir Stock", symbol: "PLTRx", decimals: 18, icon: "👁️" },
    { id: "amd", name: "AMD Stock", symbol: "AMDx", decimals: 18, icon: "🔴" },
    { id: "gme", name: "GameStop Stock", symbol: "GMEx", decimals: 18, icon: "🎮" },
    { id: "spcx", name: "SpaceX Mock Stock", symbol: "SPCXx", decimals: 18, icon: "🚀" },
  ];

  const deployedAssets = [
    {
      id: "usdg",
      symbol: "USDG",
      name: "Stable Dollar",
      address: USDG_ADDR,
      decimals: 6,
      icon: "$",
    },
    {
      id: "aaplx",
      symbol: "AAPLx",
      name: "Apple Stock",
      address: AAPL_ADDR,
      decimals: 18,
      icon: "",
    },
  ];

  const duration = 7200n;

  for (const cfg of stockConfigs) {
    console.log(`Deploying ${cfg.name} (${cfg.symbol})...`);
    const tokenContract = await MockFactory.deploy(cfg.name, cfg.symbol, cfg.decimals, deployer.address);
    await tokenContract.deploymentTransaction().wait();
    const tokenAddr = await tokenContract.getAddress();
    console.log(`  - Deployed at: ${tokenAddr}`);

    const regTx = await engine.registerRewardAsset(tokenAddr);
    await regTx.wait();
    console.log(`  - Registered on EarningEngine`);

    const mintAmount = 1_000n * 10n ** BigInt(cfg.decimals);
    await (await tokenContract.mint(deployer.address, mintAmount * 2n)).wait();

    await (await tokenContract.approve(ENGINE_ADDR, mintAmount)).wait();
    await (await engine.fundReward(tokenAddr, mintAmount, duration)).wait();
    console.log(`  - Funded on EarningEngine`);

    await (await tokenContract.approve(VAULT_ADDR, mintAmount)).wait();
    await (await vault.depositReward(tokenAddr, mintAmount)).wait();
    console.log(`  - Deposited in RewardVault`);

    deployedAssets.push({
      id: cfg.id,
      symbol: cfg.symbol,
      name: cfg.name,
      address: tokenAddr,
      decimals: cfg.decimals,
      icon: cfg.icon,
    });
  }

  console.log("\nRe-funding USDG and AAPLx for 2 hours...");
  const usdg = await ethers.getContractAt("MockRewardToken", USDG_ADDR, deployer);
  const aapl = await ethers.getContractAt("MockRewardToken", AAPL_ADDR, deployer);

  const usdgFund = 10_000n * 10n ** 6n;
  const aaplFund = 1_000n * 10n ** 18n;

  await (await usdg.mint(deployer.address, usdgFund * 2n)).wait();
  await (await aapl.mint(deployer.address, aaplFund * 2n)).wait();

  await (await usdg.approve(ENGINE_ADDR, usdgFund)).wait();
  await (await engine.fundReward(USDG_ADDR, usdgFund, duration)).wait();
  await (await usdg.approve(VAULT_ADDR, usdgFund)).wait();
  await (await vault.depositReward(USDG_ADDR, usdgFund)).wait();

  await (await aapl.approve(ENGINE_ADDR, aaplFund)).wait();
  await (await engine.fundReward(AAPL_ADDR, aaplFund, duration)).wait();
  await (await aapl.approve(VAULT_ADDR, aaplFund)).wait();
  await (await vault.depositReward(AAPL_ADDR, aaplFund)).wait();

  console.log("\n==================================================");
  console.log("FULL STOCK ASSET SUITE DEPLOYED & CONFIGURED");
  console.log("==================================================");
  console.log(JSON.stringify(deployedAssets, null, 2));

  fs.writeFileSync("all_deployed_stocks.json", JSON.stringify(deployedAssets, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exitCode = 1;
});
