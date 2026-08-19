import { ethers } from 'ethers';
import {
  ACCOUNT_SALT,
  CONTRACT_ADDRESSES,
  ROBINHOOD_TESTNET_CONFIG,
} from '../constants/contracts';

// Derives an Associate's ERC-6551 wallet address locally, so MyStack's 10-second poll costs no RPC
// calls. Mirrors backend/lib/erc6551.js; ERC6551Registry.test.js asserts the two agree.

const ERC1167_HEADER = '0x3d60ad80600a3d3981f3363d3d373d3d3d363d73';
const ERC1167_FOOTER = '0x5af43d82803e903d91602b57fd5bf3';

const UNSET = '0x0000000000000000000000000000000000000000';

export function predictAccountAddress(tokenId: number | bigint): string {
  if (CONTRACT_ADDRESSES.OOHDIES_ACCOUNT_IMPL === UNSET) {
    // Fail loudly rather than derive plausible-looking addresses from a placeholder.
    throw new Error('OOHDIES_ACCOUNT_IMPL is not set — deploy OohdiesAccount and update contracts.ts');
  }

  const initCode = ethers.concat([
    ERC1167_HEADER,
    ethers.getAddress(CONTRACT_ADDRESSES.OOHDIES_ACCOUNT_IMPL),
    ERC1167_FOOTER,
    ACCOUNT_SALT,
    ethers.toBeHex(BigInt(ROBINHOOD_TESTNET_CONFIG.chainId), 32),
    ethers.toBeHex(BigInt(ethers.getAddress(CONTRACT_ADDRESSES.OOHDIES_NFT)), 32),
    ethers.toBeHex(BigInt(tokenId), 32),
  ]);

  return ethers.getCreate2Address(
    CONTRACT_ADDRESSES.ERC6551_REGISTRY,
    ACCOUNT_SALT,
    ethers.keccak256(initCode),
  );
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
