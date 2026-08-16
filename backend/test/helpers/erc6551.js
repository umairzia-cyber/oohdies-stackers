import {
  CANONICAL_REGISTRY,
  REGISTRY_RUNTIME_BYTECODE,
} from "../../lib/erc6551.js";

// Constants live in lib/ because the scripts need them too; re-exported for a single test import.
export {
  CANONICAL_REGISTRY,
  ZERO_SALT,
  REGISTRY_RUNTIME_BYTECODE,
  ensureRegistry,
  predictAccount,
} from "../../lib/erc6551.js";

/** Installs the registry on the in-memory chain, so fixture snapshots capture it. */
export async function installRegistry(networkHelpers) {
  await networkHelpers.setCode(CANONICAL_REGISTRY, REGISTRY_RUNTIME_BYTECODE);
}

export async function getRegistry(ethers) {
  return ethers.getContractAt("IERC6551Registry", CANONICAL_REGISTRY);
}
