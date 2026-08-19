import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { CANONICAL_REGISTRY, ZERO_SALT, predictAccount } from "./erc6551.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROBINHOOD_TESTNET_CHAIN_ID = 46630n;
export const ROBINHOOD_TESTNET_CHAIN_NAME = "Robinhood Chain Testnet";
export const ROBINHOOD_TESTNET_RPC = "https://rpc.testnet.chain.robinhood.com";
export const EXPECTED_ACTIVATION_COST = 100n * 10n ** 18n; // 100 BANANA (18 decimals)
export const EXPECTED_REQUIRED_PICKS = 3n;
export const EXPECTED_ASSET_COUNT = 12;
export const COLLECTION_Q_MULTIPLIER_BPS = 20000n; // 2.0x in basis points

export const ACTIVE_DEPLOYED_CONTRACTS = {
  BANANA_TOKEN: "0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1",
  OOHDIES_NFT: "0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A",
  ACTIVATION_CONTROLLER: "0x739536FD3fCa15f0ef19c32FCA03fE6510650eD7",
  EARNING_ENGINE: "0x623283c4b68d91ffCea057E6dd6084824E269Fa1",
  REWARD_VAULT: "0x2FB7E3F8e0DB58eBa1B38B79Dcfd54DA99cf3A8C",
  ERC6551_REGISTRY: CANONICAL_REGISTRY,
  OOHDIES_ACCOUNT_IMPL: "0xFEd0429452592011C4e4c6C92560Bc2DB558CbE8",
  COLLECTION_Q: "0x65eAf7036fa72E8e4094Dd9f06Dcb6A43c530AD7",
};

/**
 * Returns a configured JsonRpcProvider connected to Robinhood Testnet.
 */
export function getTestnetProvider(customRpc = ROBINHOOD_TESTNET_RPC) {
  return new ethers.JsonRpcProvider(customRpc, {
    chainId: Number(ROBINHOOD_TESTNET_CHAIN_ID),
    name: ROBINHOOD_TESTNET_CHAIN_NAME,
  });
}

/**
 * Strict Network Safety Validator.
 * Must throw immediately and abort execution if the network is not Robinhood Testnet.
 */
export async function assertTestnetNetwork(providerOrSigner) {
  const provider = providerOrSigner.provider || providerOrSigner;
  if (!provider || typeof provider.getNetwork !== "function") {
    throw new Error("Invalid provider or signer passed to assertTestnetNetwork");
  }

  const network = await provider.getNetwork();
  const chainId = BigInt(network.chainId);

  if (chainId !== ROBINHOOD_TESTNET_CHAIN_ID) {
    throw new Error(
      `FATAL NETWORK SAFETY VIOLATION: Connected chainId ${chainId.toString()} does NOT match Robinhood Testnet (${ROBINHOOD_TESTNET_CHAIN_ID.toString()}). Execution halted.`
    );
  }

  return {
    chainId,
    name: network.name || ROBINHOOD_TESTNET_CHAIN_NAME,
  };
}

/**
 * Loads contract ABI from the backend artifacts directory.
 */
export function getContractAbi(contractName, backendRoot = path.join(__dirname, "..")) {
  const artifactPaths = [
    path.join(backendRoot, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`),
    path.join(backendRoot, "artifacts", "contracts", "mocks", `${contractName}.sol`, `${contractName}.json`),
    path.join(backendRoot, "artifacts", "contracts", "erc6551", `${contractName}.sol`, `${contractName}.json`),
  ];

  for (const p of artifactPaths) {
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
      return artifact.abi;
    }
  }

  throw new Error(`ABI artifact for ${contractName} not found in ${path.join(backendRoot, "artifacts")}`);
}

/**
 * Instantiates an ethers.Contract on Robinhood Testnet.
 */
export function getTestnetContract(contractName, address, signerOrProvider, backendRoot = path.join(__dirname, "..")) {
  const abi = getContractAbi(contractName, backendRoot);
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Loads all core deployed testnet contracts.
 */
export function getAllTestnetContracts(signerOrProvider, backendRoot = path.join(__dirname, "..")) {
  return {
    nft: getTestnetContract("OohdiesNFT", ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT, signerOrProvider, backendRoot),
    banana: getTestnetContract("BananaToken", ACTIVE_DEPLOYED_CONTRACTS.BANANA_TOKEN, signerOrProvider, backendRoot),
    activation: getTestnetContract("ActivationController", ACTIVE_DEPLOYED_CONTRACTS.ACTIVATION_CONTROLLER, signerOrProvider, backendRoot),
    engine: getTestnetContract("EarningEngine", ACTIVE_DEPLOYED_CONTRACTS.EARNING_ENGINE, signerOrProvider, backendRoot),
    vault: getTestnetContract("RewardVault", ACTIVE_DEPLOYED_CONTRACTS.REWARD_VAULT, signerOrProvider, backendRoot),
    colQ: getTestnetContract("MockCollectionQ", ACTIVE_DEPLOYED_CONTRACTS.COLLECTION_Q, signerOrProvider, backendRoot),
    registry: getTestnetContract("IERC6551Registry", ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY, signerOrProvider, backendRoot),
  };
}

/**
 * Loads and strictly validates the authoritative list of 12 reward assets.
 */
export function loadAllRewardAssets(backendRoot = path.join(__dirname, "..")) {
  const filePath = path.join(backendRoot, "all_deployed_stocks.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Critical file missing: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(raw) || raw.length !== EXPECTED_ASSET_COUNT) {
    throw new Error(
      `all_deployed_stocks.json must contain exactly ${EXPECTED_ASSET_COUNT} assets. Found: ${raw ? raw.length : 0}`
    );
  }

  const seenAddresses = new Set();
  const seenSymbols = new Set();

  for (let i = 0; i < raw.length; i++) {
    const asset = raw[i];
    if (!asset.address || typeof asset.address !== "string" || asset.address === "0x" + "00".repeat(20)) {
      throw new Error(`Asset #${i + 1} (${asset.symbol}) has invalid address: ${asset.address}`);
    }

    const lower = asset.address.toLowerCase();
    if (seenAddresses.has(lower)) {
      throw new Error(`Duplicate reward asset address detected: ${asset.address}`);
    }
    seenAddresses.add(lower);

    if (seenSymbols.has(asset.symbol)) {
      throw new Error(`Duplicate reward asset symbol detected: ${asset.symbol}`);
    }
    seenSymbols.add(asset.symbol);
  }

  return raw;
}

/**
 * Loads the active deployment configuration from deployment.json or returns default verified constants.
 */
export function loadDeploymentConfig(backendRoot = path.join(__dirname, "..")) {
  const filePath = path.join(backendRoot, "deployment.json");
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return parsed;
    } catch {
      // Fallback to active deployed constants if parsing fails
    }
  }
  return {
    network: "robinhoodTestnet",
    chainId: ROBINHOOD_TESTNET_CHAIN_ID.toString(),
    contracts: ACTIVE_DEPLOYED_CONTRACTS,
  };
}

export { CANONICAL_REGISTRY, ZERO_SALT, predictAccount };
