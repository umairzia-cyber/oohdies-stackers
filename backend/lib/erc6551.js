import { concat, getAddress, getCreate2Address, keccak256, toBeHex } from "ethers";

// Shared ERC-6551 constants and address derivation, used by scripts and (via
// test/helpers/erc6551.js) the test suite. The frontend mirrors predictAccount.

/** Canonical registry address, identical on every chain that has one. */
export const CANONICAL_REGISTRY = "0x000000006551c19487814612e58FE06813775758";

export const ZERO_SALT = "0x" + "00".repeat(32);

/**
 * Registry runtime bytecode, copied from Robinhood testnet. Installing it at CANONICAL_REGISTRY
 * makes a local chain behave like the real one. Do not modify — it determines every account address.
 */
export const REGISTRY_RUNTIME_BYTECODE =
  "0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063246a00211461003b5780638a54c52f1461006a575b600080fd5b61004e6100493660046101b7565b61007d565b6040516001600160a01b03909116815260200160405180910390f35b61004e6100783660046101b7565b6100e1565b600060806024608c376e5af43d82803e903d91602b57fd5bf3606c5285605d52733d60ad80600a3d3981f3363d3d373d3d3d363d7360495260ff60005360b76055206035523060601b60015284601552605560002060601b60601c60005260206000f35b600060806024608c376e5af43d82803e903d91602b57fd5bf3606c5285605d52733d60ad80600a3d3981f3363d3d373d3d3d363d7360495260ff60005360b76055206035523060601b600152846015526055600020803b61018b578560b760556000f580610157576320188a596000526004601cfd5b80606c52508284887f79f19b3655ee38b1ce526556b7731a20c8f218fbda4a3990b6cc4172fdf887226060606ca46020606cf35b8060601b60601c60005260206000f35b80356001600160a01b03811681146101b257600080fd5b919050565b600080600080600060a086880312156101cf57600080fd5b6101d88661019b565b945060208601359350604086013592506101f46060870161019b565b94979396509194608001359291505056fea2646970667358221220ea2fe53af507453c64dd7c1db05549fa47a298dfb825d6d11e1689856135f16764736f6c63430008110033";

const ERC1167_HEADER = "0x3d60ad80600a3d3981f3363d3d373d3d3d363d73";
const ERC1167_FOOTER = "0x5af43d82803e903d91602b57fd5bf3";

/** No-op on a real network; installs the registry via hardhat_setCode on a local devnet. */
export async function ensureRegistry(provider) {
  const existing = await provider.getCode(CANONICAL_REGISTRY);
  if (existing && existing !== "0x") return "present";

  await provider.send("hardhat_setCode", [CANONICAL_REGISTRY, REGISTRY_RUNTIME_BYTECODE]);

  const installed = await provider.getCode(CANONICAL_REGISTRY);
  if (!installed || installed === "0x") {
    throw new Error(
      `Could not install the ERC-6551 registry at ${CANONICAL_REGISTRY}. ` +
        "This chain has no registry and does not support hardhat_setCode."
    );
  }
  return "installed";
}

/** Computes an account address offline. Drift from the chain shows wrong wallets in the UI. */
export function predictAccount({
  implementation,
  tokenContract,
  tokenId,
  chainId,
  salt = ZERO_SALT,
  registry = CANONICAL_REGISTRY,
}) {
  const initCode = concat([
    ERC1167_HEADER,
    getAddress(implementation),
    ERC1167_FOOTER,
    salt,
    toBeHex(BigInt(chainId), 32),
    toBeHex(BigInt(getAddress(tokenContract)), 32),
    toBeHex(BigInt(tokenId), 32),
  ]);

  return getCreate2Address(registry, salt, keccak256(initCode));
}
