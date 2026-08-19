import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  ACTIVE_DEPLOYED_CONTRACTS,
  getTestnetProvider,
  assertTestnetNetwork,
  loadAllRewardAssets,
  getTestnetContract,
} from "../../lib/testnet_config.js";
import { getTestWallets, getWalletBalances } from "../../lib/testnet_wallets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function fundTestWallets({
  targetWallet = "alice", // "alice" | "bob" | "attacker" | "all" | explicit address
  ethAmount = "0.0002",
  bananaAmount = "500", // 500 BANANA
  customProvider = null,
} = {}) {
  console.log("==================================================");
  console.log("⚡ ROBINHOOD TESTNET — TEST WALLET FUNDING HELPER");
  console.log("==================================================");

  const provider = customProvider || getTestnetProvider();
  await assertTestnetNetwork(provider);

  const wallets = getTestWallets(provider);
  if (!wallets.deployer) {
    throw new Error(
      "Deployer private key not found in environment (PRIVATE_KEY / DEPLOYER_PRIVATE_KEY / TESTNET_DEPLOYER_PRIVATE_KEY). Cannot sign funding transactions."
    );
  }

  const deployer = wallets.deployer;
  const deployerBalance = await provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployer Gas Balance: ${ethers.formatEther(deployerBalance)} ETH`);

  if (deployerBalance === 0n) {
    throw new Error("Deployer has 0 ETH balance. Cannot send gas or fund wallets.");
  }

  const banana = getTestnetContract("BananaToken", ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN, deployer);
  const rewardAssets = loadAllRewardAssets();

  // Determine recipients
  let recipients = [];
  if (targetWallet === "alice") {
    recipients = [{ name: "Alice", address: wallets.alice.address }];
  } else if (targetWallet === "bob") {
    recipients = [{ name: "Bob", address: wallets.bob.address }];
  } else if (targetWallet === "attacker") {
    recipients = [{ name: "Attacker", address: wallets.attacker.address }];
  } else if (targetWallet === "all") {
    recipients = [
      { name: "Alice", address: wallets.alice.address },
      { name: "Bob", address: wallets.bob.address },
      { name: "Attacker", address: wallets.attacker.address },
    ];
  } else if (ethers.isAddress(targetWallet)) {
    recipients = [{ name: "Custom", address: targetWallet }];
  } else {
    throw new Error(`Unknown target wallet: ${targetWallet}`);
  }

  console.log(`\nFunding ${recipients.length} target wallet(s)...`);

  for (const r of recipients) {
    console.log(`\n--- Funding ${r.name} (${r.address}) ---`);

    // 1. Gas Funding (ETH)
    if (ethAmount && Number(ethAmount) > 0) {
      const currentEth = await provider.getBalance(r.address);
      const parsedEth = ethers.parseEther(ethAmount);

      console.log(`  Current ETH: ${ethers.formatEther(currentEth)} ETH`);
      console.log(`  Sending:     ${ethAmount} ETH...`);

      const tx = await deployer.sendTransaction({
        to: r.address,
        value: parsedEth,
      });
      const receipt = await tx.wait();
      console.log(`  ✓ Gas transfer confirmed (Tx: ${receipt.hash})`);

      const newEth = await provider.getBalance(r.address);
      if (newEth <= currentEth) {
        throw new Error(`State assertion failure: ${r.name} ETH balance did not increase!`);
      }
      console.log(`  ✓ Verified New ETH Balance: ${ethers.formatEther(newEth)} ETH`);
    }

    // 2. BANANA Funding
    if (bananaAmount && Number(bananaAmount) > 0) {
      const parsedBanana = ethers.parseEther(bananaAmount);
      const currentBanana = await banana.balanceOf(r.address);

      console.log(`  Current BANANA: ${ethers.formatEther(currentBanana)} BANANA`);
      console.log(`  Sending:        ${bananaAmount} BANANA...`);

      const tx = await banana.transfer(r.address, parsedBanana);
      const receipt = await tx.wait();
      console.log(`  ✓ BANANA transfer confirmed (Tx: ${receipt.hash})`);

      const newBanana = await banana.balanceOf(r.address);
      if (newBanana !== currentBanana + parsedBanana) {
        throw new Error(`State assertion failure: ${r.name} BANANA balance mismatch!`);
      }
      console.log(`  ✓ Verified New BANANA Balance: ${ethers.formatEther(newBanana)} BANANA`);
    }
  }

  console.log("\n==================================================");
  console.log("🎉 TEST WALLET FUNDING COMPLETED AND VERIFIED");
  console.log("==================================================");
  return true;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  fundTestWallets().catch((err) => {
    console.error("\n❌ FUNDING FAILED:");
    console.error(err);
    process.exit(1);
  });
}
