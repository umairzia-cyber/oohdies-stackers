import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvKey(name, backendRoot = path.join(__dirname, "..")) {
  let val = process.env[name] || "";
  if (!val) {
    const envPath = path.join(backendRoot, ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const regex = new RegExp(`${name}\\s*=\\s*(?:0x)?\\s*[<"']?\\s*(?:0x)?\\s*([a-fA-F0-9]{64})\\s*[>"']?`, "i");
      const match = content.match(regex);
      if (match) {
        val = match[1];
      }
    }
  }
  return val ? (val.startsWith("0x") ? val : `0x${val}`) : "";
}

/**
 * Returns configured or ephemeral testnet wallets for testing without ever logging private keys.
 */
export function getTestWallets(provider, backendRoot = path.join(__dirname, "..")) {
  // 1. Deployer Wallet
  const deployerKey =
    getEnvKey("PRIVATE_KEY", backendRoot) ||
    getEnvKey("DEPLOYER_PRIVATE_KEY", backendRoot) ||
    getEnvKey("TESTNET_DEPLOYER_PRIVATE_KEY", backendRoot);

  let deployer = null;
  if (deployerKey) {
    deployer = new ethers.Wallet(deployerKey, provider);
  }

  // 2. Alice Wallet
  const aliceKey = getEnvKey("TESTNET_ALICE_PRIVATE_KEY", backendRoot) || getEnvKey("ALICE_PRIVATE_KEY", backendRoot);
  const aliceFallbackKey = ethers.keccak256(ethers.toUtf8Bytes("oohdies-testnet-alice-fallback-v1"));
  const alice = new ethers.Wallet(aliceKey || aliceFallbackKey, provider);

  // 3. Bob Wallet
  const bobKey = getEnvKey("TESTNET_BOB_PRIVATE_KEY", backendRoot) || getEnvKey("BOB_PRIVATE_KEY", backendRoot);
  const bobFallbackKey = ethers.keccak256(ethers.toUtf8Bytes("oohdies-testnet-bob-fallback-v1"));
  const bob = new ethers.Wallet(bobKey || bobFallbackKey, provider);

  // 4. Attacker Wallet
  const attackerKey =
    getEnvKey("TESTNET_ATTACKER_PRIVATE_KEY", backendRoot) || getEnvKey("ATTACKER_PRIVATE_KEY", backendRoot);
  const attackerFallbackKey = ethers.keccak256(ethers.toUtf8Bytes("oohdies-testnet-attacker-fallback-v1"));
  const attacker = new ethers.Wallet(attackerKey || attackerFallbackKey, provider);

  return {
    deployer,
    alice,
    bob,
    attacker,
    hasConfiguredDeployer: Boolean(deployerKey),
    hasConfiguredAlice: Boolean(aliceKey),
    hasConfiguredBob: Boolean(bobKey),
    hasConfiguredAttacker: Boolean(attackerKey),
  };
}

/**
 * Queries on-chain balances (ETH, BANANA, mock stocks) for a given wallet address.
 */
export async function getWalletBalances({
  address,
  provider,
  bananaAddress,
  nftAddress,
  rewardAssets = [],
}) {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid wallet address: ${address}`);
  }

  const ethBalance = await provider.getBalance(address);

  let bananaBalance = 0n;
  if (bananaAddress) {
    try {
      const bananaContract = new ethers.Contract(
        bananaAddress,
        ["function balanceOf(address) external view returns (uint256)"],
        provider
      );
      bananaBalance = await bananaContract.balanceOf(address);
    } catch {
      bananaBalance = 0n;
    }
  }

  let nftBalance = 0n;
  if (nftAddress) {
    try {
      const nftContract = new ethers.Contract(
        nftAddress,
        ["function balanceOf(address) external view returns (uint256)"],
        provider
      );
      nftBalance = await nftContract.balanceOf(address);
    } catch {
      nftBalance = 0n;
    }
  }

  const stockBalances = {};
  for (const asset of rewardAssets) {
    try {
      const token = new ethers.Contract(
        asset.address,
        ["function balanceOf(address) external view returns (uint256)"],
        provider
      );
      const bal = await token.balanceOf(address);
      stockBalances[asset.symbol] = bal;
    } catch {
      stockBalances[asset.symbol] = 0n;
    }
  }

  return {
    address,
    ethBalance,
    formattedEth: ethers.formatEther(ethBalance),
    bananaBalance,
    formattedBanana: ethers.formatEther(bananaBalance),
    nftBalance,
    stockBalances,
  };
}
