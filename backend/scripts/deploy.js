import fs from "fs";
import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();
  console.log("=== Completing Robinhood Chain Testnet Protocol Deployment ===");

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

  const BANANA_ADDR     = "0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1";
  const NFT_ADDR        = "0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A";
  const ACTIVATION_ADDR = "0x9d3A2350d8679B8828003b96D35c125037F29F49";
  const ENGINE_ADDR     = "0xB17eD4e01FbBA8F123412156a3545dB53585c179";
  const VAULT_ADDR      = "0xC7DD1b6110dBdDf15636240f85341de2b8B21EfD";

  const bananaCode     = await provider.getCode(BANANA_ADDR);
  const nftCode        = await provider.getCode(NFT_ADDR);
  const activationCode = await provider.getCode(ACTIVATION_ADDR);
  const engineCode     = await provider.getCode(ENGINE_ADDR);
  const vaultCode      = await provider.getCode(VAULT_ADDR);

  if (bananaCode === "0x" || nftCode === "0x" || activationCode === "0x" || engineCode === "0x" || vaultCode === "0x") {
    throw new Error("One or more core contracts missing bytecode on-chain!");
  }

  console.log("Verified core contract bytecodes exist at all 5 deployed addresses.");

  const banana     = await ethers.getContractAt("BananaToken", BANANA_ADDR, deployer);
  const nft        = await ethers.getContractAt("OohdiesNFT", NFT_ADDR, deployer);
  const activation = await ethers.getContractAt("ActivationController", ACTIVATION_ADDR, deployer);
  const engine     = await ethers.getContractAt("EarningEngine", ENGINE_ADDR, deployer);
  const vault      = await ethers.getContractAt("RewardVault", VAULT_ADDR, deployer);

  const deploymentData = {
    network: "robinhoodTestnet",
    chainId: net.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      BananaToken: {
        address: BANANA_ADDR,
        transactionHash: "0xfa37bf4b99704263cc46c8fe893363ab6a751f9683a106c3b2ec467671afd4a8",
        blockNumber: 421689,
        gasUsed: "1474390",
      },
      OohdiesNFT: {
        address: NFT_ADDR,
        transactionHash: "0xb81d0c09167f7c37993ea4c497c4cf220aca06433850cef478f69e90c4e47662",
        blockNumber: 421690,
        gasUsed: "3541295",
      },
      ActivationController: {
        address: ACTIVATION_ADDR,
        transactionHash: "0xdacc0650d0dab8320ff8327a48c6be7f9db3fb2613357cd3c888df458675515a",
        blockNumber: 421691,
        gasUsed: "1229329",
      },
      EarningEngine: {
        address: ENGINE_ADDR,
        transactionHash: "0x3bea63053df32a040bd847044ec17b3fd197ff5c44c0abb0d8a2fa28dcc10b97",
        blockNumber: 421692,
        gasUsed: "3055281",
      },
      RewardVault: {
        address: VAULT_ADDR,
        transactionHash: "0xb1e54ca5609c049718b0fa1cf22a146b7d50d8887b7315fbad395273bed5df35",
        blockNumber: 421693,
        gasUsed: "1745818",
      },
    },
    configurations: {},
    gasUsedTotal: "11046113",
  };

  let totalGasUsed = 11046113n;

  console.log("\nDeploying Mock Reward Tokens (USDG 6 dec, AAPLx 18 dec)...");
  const MockFactory = await ethers.getContractFactory("MockRewardToken");

  const usdg = await MockFactory.deploy("USD Governance", "USDG", 6, deployer.address);
  const usdgReceipt = await usdg.deploymentTransaction().wait();
  const usdgAddr = await usdg.getAddress();
  totalGasUsed += usdgReceipt.gasUsed;
  console.log(`Mock USDG (6 dec) deployed at: ${usdgAddr} (Tx: ${usdgReceipt.hash}, Gas: ${usdgReceipt.gasUsed})`);

  deploymentData.contracts.MockUSDG = {
    address: usdgAddr,
    transactionHash: usdgReceipt.hash,
    blockNumber: usdgReceipt.blockNumber,
    gasUsed: usdgReceipt.gasUsed.toString(),
  };

  const aapl = await MockFactory.deploy("Apple Stock Synthetic", "AAPLx", 18, deployer.address);
  const aaplReceipt = await aapl.deploymentTransaction().wait();
  const aaplAddr = await aapl.getAddress();
  totalGasUsed += aaplReceipt.gasUsed;
  console.log(`Mock AAPLx (18 dec) deployed at: ${aaplAddr} (Tx: ${aaplReceipt.hash}, Gas: ${aaplReceipt.gasUsed})`);

  deploymentData.contracts.MockAAPLx = {
    address: aaplAddr,
    transactionHash: aaplReceipt.hash,
    blockNumber: aaplReceipt.blockNumber,
    gasUsed: aaplReceipt.gasUsed.toString(),
  };

  console.log("\nConfiguring inter-contract references and permissions...");

  const currentEngine = await nft.earningEngine();
  if (currentEngine.toLowerCase() !== ENGINE_ADDR.toLowerCase()) {
    const tx = await nft.setEarningEngine(ENGINE_ADDR);
    await tx.wait();
    console.log("  - OohdiesNFT.setEarningEngine -> OK");
  } else {
    console.log("  - OohdiesNFT.setEarningEngine -> Already Configured");
  }

  const currentActivation = await nft.activationController();
  if (currentActivation.toLowerCase() !== ACTIVATION_ADDR.toLowerCase()) {
    const tx = await nft.setActivationController(ACTIVATION_ADDR);
    await tx.wait();
    console.log("  - OohdiesNFT.setActivationController -> OK");
  } else {
    console.log("  - OohdiesNFT.setActivationController -> Already Configured");
  }

  const currentVault = await engine.rewardVault();
  if (currentVault.toLowerCase() !== VAULT_ADDR.toLowerCase()) {
    const tx = await engine.setRewardVault(VAULT_ADDR);
    await tx.wait();
    console.log("  - EarningEngine.setRewardVault -> OK");
  } else {
    console.log("  - EarningEngine.setRewardVault -> Already Configured");
  }

  const isFunder = await engine.isFunder(deployer.address);
  if (!isFunder) {
    const tx = await engine.setFunder(deployer.address, true);
    await tx.wait();
    console.log("  - EarningEngine.setFunder(deployer) -> OK");
  } else {
    console.log("  - EarningEngine.setFunder(deployer) -> Already Configured");
  }

  const regAssets = await engine.getRegisteredRewardAssets();
  const hasUsdg = regAssets.some(a => a.toLowerCase() === usdgAddr.toLowerCase());
  if (!hasUsdg) {
    const tx = await engine.registerRewardAsset(usdgAddr);
    await tx.wait();
    console.log("  - EarningEngine.registerRewardAsset(USDG) -> OK");
  }

  const hasAapl = regAssets.some(a => a.toLowerCase() === aaplAddr.toLowerCase());
  if (!hasAapl) {
    const tx = await engine.registerRewardAsset(aaplAddr);
    await tx.wait();
    console.log("  - EarningEngine.registerRewardAsset(AAPLx) -> OK");
  }

  deploymentData.gasUsedTotal = totalGasUsed.toString();

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentData, null, 2));
  console.log("\nDeployment & Configuration complete! Saved metadata to deployment.json.");

  console.log("\n=== Verifying Deployed On-Chain State ===");
  const bananaOwner    = await banana.owner();
  const bananaSupply   = await banana.totalSupply();
  const nftOwner       = await nft.owner();
  const nftMaxSupply   = await nft.MAX_SUPPLY();
  const nftEngine      = await nft.earningEngine();
  const nftActivation  = await nft.activationController();
  const engineVault    = await engine.rewardVault();
  const isFunderStatus = await engine.isFunder(deployer.address);
  const finalRegAssets = await engine.getRegisteredRewardAssets();
  const actCost        = await activation.activationCost();

  console.log("BananaToken Owner:     ", bananaOwner);
  console.log("BananaToken Supply:    ", ethers.formatEther(bananaSupply), "BANANA");
  console.log("OohdiesNFT Owner:      ", nftOwner);
  console.log("OohdiesNFT Max Supply: ", nftMaxSupply.toString());
  console.log("OohdiesNFT Engine:     ", nftEngine);
  console.log("OohdiesNFT Activation: ", nftActivation);
  console.log("EarningEngine Vault:   ", engineVault);
  console.log("Deployer is Funder:    ", isFunderStatus);
  console.log("Registered Assets:     ", finalRegAssets);
  console.log("Activation Cost:       ", ethers.formatEther(actCost), "BANANA");

  const balanceAfter = await provider.getBalance(deployer.address);
  const ethSpent = balanceBefore - balanceAfter;
  console.log("\nFinal Deployer Balance: ", ethers.formatEther(balanceAfter), "ETH");
  console.log("Script Execution Cost:  ", ethers.formatEther(ethSpent), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
