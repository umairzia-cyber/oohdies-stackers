import fs from "fs";
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

let envPrivateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "";
if (!envPrivateKey && fs.existsSync(".env")) {
  const match = fs.readFileSync(".env", "utf8").match(/PRIVATE_KEY\s*=\s*(?:0x)?\s*[<"']?\s*(?:0x)?\s*([a-fA-F0-9]{64})\s*[>"']?/i);
  if (match) {
    envPrivateKey = match[1];
  }
}
const PRIVATE_KEY = envPrivateKey ? (envPrivateKey.startsWith("0x") ? envPrivateKey : `0x${envPrivateKey}`) : "";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    robinhoodTestnet: {
      type: "http",
      url: "https://rpc.testnet.chain.robinhood.com",
      chainId: 46630,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    tests: {
      mocha: "./test",
    },
  },
});
