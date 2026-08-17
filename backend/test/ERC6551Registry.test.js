import { expect } from "chai";
import hre from "hardhat";
import {
  CANONICAL_REGISTRY,
  ZERO_SALT,
  getRegistry,
  installRegistry,
  predictAccount,
} from "./helpers/erc6551.js";

describe("ERC6551Registry", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const IMPL_A = "0x1111111111111111111111111111111111111111";
  const IMPL_B = "0x2222222222222222222222222222222222222222";

  let connection;
  let ethers;
  let networkHelpers;

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function deployRegistryFixture() {
    const [owner] = await ethers.getSigners();

    await installRegistry(networkHelpers);
    const registry = await getRegistry(ethers);

    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(owner.address);
    const nftAddr = await nft.getAddress();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    return { owner, registry, nft, nftAddr, chainId };
  }

  describe("Installing the registry locally", function () {
    it("puts the canonical registry at the canonical address", async function () {
      const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

      const code = await ethers.provider.getCode(CANONICAL_REGISTRY);
      expect(code).to.not.equal("0x");
      expect(await registry.getAddress()).to.equal(CANONICAL_REGISTRY);
    });
  });

  describe("Address computation", function () {
    it("returns a non-zero account address", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const addr = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      expect(addr).to.not.equal(ZERO_ADDRESS);
    });

    it("is deterministic — identical inputs always give the identical address", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const first = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 7n);
      const second = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 7n);
      expect(first).to.equal(second);
    });

    it("gives every tokenId a distinct address", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const seen = new Set();
      for (let tokenId = 1n; tokenId <= 25n; tokenId++) {
        const addr = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, tokenId);
        expect(seen.has(addr), `tokenId ${tokenId} collided`).to.equal(false);
        seen.add(addr);
      }
      expect(seen.size).to.equal(25);
    });

    it("gives a different address for a different implementation", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      // Which is why the implementation address cannot change after launch.
      const withA = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      const withB = await registry.account(IMPL_B, ZERO_SALT, chainId, nftAddr, 1n);
      expect(withA).to.not.equal(withB);
    });

    it("gives a different address for a different salt", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const otherSalt = "0x" + "00".repeat(31) + "01";
      const withZero = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      const withOther = await registry.account(IMPL_A, otherSalt, chainId, nftAddr, 1n);
      expect(withZero).to.not.equal(withOther);
    });
  });

  describe("Offline derivation (the frontend's formula)", function () {
    it("TRIPWIRE: predictAccount() in JS matches registry.account() on chain", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      // The frontend derives addresses offline. If this fails the formula has drifted and the
      // UI will show wrong wallets with no error.
      for (const tokenId of [1n, 2n, 42n, 1111n]) {
        const onChain = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, tokenId);
        const offChain = predictAccount({
          implementation: IMPL_A,
          tokenContract: nftAddr,
          tokenId,
          chainId,
        });
        expect(offChain, `tokenId ${tokenId}`).to.equal(onChain);
      }
    });

    it("matches on chain across differing implementations and salts too", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const salt = "0x" + "ab".repeat(32);
      const onChain = await registry.account(IMPL_B, salt, chainId, nftAddr, 9n);
      const offChain = predictAccount({
        implementation: IMPL_B,
        tokenContract: nftAddr,
        tokenId: 9n,
        chainId,
        salt,
      });
      expect(offChain).to.equal(onChain);
    });
  });

  describe("Account creation", function () {
    it("deploys code at the predicted address", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const predicted = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      expect(await ethers.provider.getCode(predicted)).to.equal("0x");

      await registry.createAccount(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);

      expect(await ethers.provider.getCode(predicted)).to.not.equal("0x");
    });

    it("is idempotent — creating twice does not revert and returns the same address", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      const predicted = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 3n);

      await registry.createAccount(IMPL_A, ZERO_SALT, chainId, nftAddr, 3n);
      // Safe to call speculatively, which is why the vault never forces creation.
      await (await registry.createAccount(IMPL_A, ZERO_SALT, chainId, nftAddr, 3n)).wait();

      expect(await registry.createAccount.staticCall(IMPL_A, ZERO_SALT, chainId, nftAddr, 3n)).to.equal(
        predicted
      );
    });

    it("emits ERC6551AccountCreated on first creation", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      await expect(registry.createAccount(IMPL_A, ZERO_SALT, chainId, nftAddr, 5n)).to.emit(
        registry,
        "ERC6551AccountCreated"
      );
    });

    it("stamps the token identity into the deployed account's bytecode", async function () {
      const { registry, nftAddr, chainId } = await networkHelpers.loadFixture(deployRegistryFixture);

      await registry.createAccount(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      const predicted = await registry.account(IMPL_A, ZERO_SALT, chainId, nftAddr, 1n);
      const code = await ethers.provider.getCode(predicted);

      // 45-byte ERC-1167 proxy + 128-byte footer, which token() reads back at 0x4d.
      expect((code.length - 2) / 2).to.equal(173);

      const footer = "0x" + code.slice(2 + 45 * 2);
      const [decodedChainId, decodedContract, decodedTokenId] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "address", "uint256"],
        "0x" + footer.slice(2 + 32 * 2)
      );
      expect(decodedChainId).to.equal(chainId);
      expect(decodedContract).to.equal(nftAddr);
      expect(decodedTokenId).to.equal(1n);
    });
  });
});
