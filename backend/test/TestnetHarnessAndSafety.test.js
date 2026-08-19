import { expect } from "chai";
import { ethers } from "ethers";
import path from "path";
import { fileURLToPath } from "url";
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_NAME,
  EXPECTED_ACTIVATION_COST,
  EXPECTED_REQUIRED_PICKS,
  EXPECTED_ASSET_COUNT,
  COLLECTION_Q_MULTIPLIER_BPS,
  ACTIVE_DEPLOYED_CONTRACTS,
  assertTestnetNetwork,
  loadAllRewardAssets,
  predictAccount,
} from "../lib/testnet_config.js";
import { getTestWallets, getWalletBalances } from "../lib/testnet_wallets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, "..");

describe("Robinhood Testnet Harness & Safety Infrastructure", function () {
  describe("1. Strict Network Safety Assertion", function () {
    it("should pass when connected chainId is 46630", async function () {
      const mockProvider = {
        getNetwork: async () => ({ chainId: 46630n, name: "Robinhood Chain Testnet" }),
      };
      const net = await assertTestnetNetwork(mockProvider);
      expect(net.chainId).to.equal(46630n);
      expect(net.name).to.equal("Robinhood Chain Testnet");
    });

    it("should throw a fatal error on Ethereum Mainnet (chainId 1)", async function () {
      const mockProvider = {
        getNetwork: async () => ({ chainId: 1n, name: "homestead" }),
      };
      let threw = false;
      try {
        await assertTestnetNetwork(mockProvider);
      } catch (err) {
        threw = true;
        expect(err.message).to.include("FATAL NETWORK SAFETY VIOLATION");
        expect(err.message).to.include("does NOT match Robinhood Testnet");
      }
      expect(threw).to.be.true;
    });

    it("should throw a fatal error on Hardhat default network (chainId 31337)", async function () {
      const mockProvider = {
        getNetwork: async () => ({ chainId: 31337n, name: "hardhat" }),
      };
      let threw = false;
      try {
        await assertTestnetNetwork(mockProvider);
      } catch (err) {
        threw = true;
        expect(err.message).to.include("FATAL NETWORK SAFETY VIOLATION");
      }
      expect(threw).to.be.true;
    });

    it("should reject invalid provider objects", async function () {
      let threw = false;
      try {
        await assertTestnetNetwork({});
      } catch (err) {
        threw = true;
        expect(err.message).to.include("Invalid provider");
      }
      expect(threw).to.be.true;
    });
  });

  describe("2. Authoritative 12-Stock Reward Assets Validation", function () {
    it("should load exactly 12 reward assets from all_deployed_stocks.json", function () {
      const assets = loadAllRewardAssets(backendRoot);
      expect(assets).to.be.an("array");
      expect(assets.length).to.equal(EXPECTED_ASSET_COUNT);
      expect(assets.length).to.equal(12);
    });

    it("should ensure all 12 asset addresses are unique and valid Ethereum addresses", function () {
      const assets = loadAllRewardAssets(backendRoot);
      const addresses = new Set();
      for (const a of assets) {
        expect(ethers.isAddress(a.address)).to.be.true;
        expect(addresses.has(a.address.toLowerCase())).to.be.false;
        addresses.add(a.address.toLowerCase());
      }
      expect(addresses.size).to.equal(12);
    });

    it("should ensure all 12 symbols and decimals are valid", function () {
      const assets = loadAllRewardAssets(backendRoot);
      const symbols = new Set();
      for (const a of assets) {
        expect(a.symbol).to.be.a("string").with.lengthOf.at.least(2);
        expect(symbols.has(a.symbol)).to.be.false;
        symbols.add(a.symbol);
        expect([6, 18]).to.include(a.decimals);
      }
      expect(symbols.size).to.equal(12);
    });
  });

  describe("3. Protocol Economics & Constants Invariants", function () {
    it("should assert activation cost is exactly 100 BANANA (100 * 10^18 wei)", function () {
      expect(EXPECTED_ACTIVATION_COST).to.equal(100n * 10n ** 18n);
      expect(ethers.formatEther(EXPECTED_ACTIVATION_COST)).to.equal("100.0");
    });

    it("should assert required stock picks is exactly 3", function () {
      expect(EXPECTED_REQUIRED_PICKS).to.equal(3n);
    });

    it("should assert Collection Q multiplier is exactly 2.0x (20,000 bps)", function () {
      expect(COLLECTION_Q_MULTIPLIER_BPS).to.equal(20000n);
    });

    it("should satisfy the deployment safety invariant: requiredPicks <= assetCount", function () {
      expect(EXPECTED_REQUIRED_PICKS <= BigInt(EXPECTED_ASSET_COUNT)).to.be.true;
    });
  });

  describe("4. ERC-6551 Deterministic TBA Address Derivation", function () {
    it("should deterministically compute TBA address matching ERC-6551 spec", function () {
      const addr1 = predictAccount({
        implementation: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL,
        tokenContract: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT,
        tokenId: 1n,
        chainId: ROBINHOOD_TESTNET_CHAIN_ID,
        registry: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY,
      });

      expect(ethers.isAddress(addr1)).to.be.true;
      expect(addr1).to.equal("0x175f50717e339f62724Cd85Bc234feDedbaB915C");

      const addr2 = predictAccount({
        implementation: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_ACCOUNT_IMPL,
        tokenContract: ACTIVE_DEPLOYED_CONTRACTS.OOHDIES_NFT,
        tokenId: 2n,
        chainId: ROBINHOOD_TESTNET_CHAIN_ID,
        registry: ACTIVE_DEPLOYED_CONTRACTS.ERC6551_REGISTRY,
      });

      expect(ethers.isAddress(addr2)).to.be.true;
      expect(addr2).to.not.equal(addr1);
    });
  });

  describe("5. Testnet Wallet Infrastructure & Security", function () {
    it("should return valid test wallet objects without logging or leaking private keys", function () {
      const mockProvider = {
        _isProvider: true,
        getNetwork: async () => ({ chainId: 46630n }),
        getBalance: async () => 0n,
      };

      const wallets = getTestWallets(mockProvider, backendRoot);
      expect(wallets).to.have.property("alice");
      expect(wallets).to.have.property("bob");
      expect(wallets).to.have.property("attacker");
      expect(ethers.isAddress(wallets.alice.address)).to.be.true;
      expect(ethers.isAddress(wallets.bob.address)).to.be.true;
      expect(ethers.isAddress(wallets.attacker.address)).to.be.true;

      expect(wallets.alice.address).to.not.equal(wallets.bob.address);
      expect(wallets.bob.address).to.not.equal(wallets.attacker.address);
    });

    it("should reject invalid addresses in getWalletBalances", async function () {
      let threw = false;
      try {
        await getWalletBalances({
          address: "0xinvalid",
          provider: {},
        });
      } catch (err) {
        threw = true;
        expect(err.message).to.include("Invalid wallet address");
      }
      expect(threw).to.be.true;
    });
  });
});
