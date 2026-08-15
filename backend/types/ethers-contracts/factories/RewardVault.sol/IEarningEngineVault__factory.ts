import { Contract, Interface, type ContractRunner } from "ethers";
  import type { IEarningEngineVault, IEarningEngineVaultInterface } from "../../RewardVault.sol/IEarningEngineVault.js";

  const _abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "deductClaimableReward",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRegisteredRewardAssets",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "getTotalClaimableReward",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

  export class IEarningEngineVault__factory {
    static readonly abi = _abi;
    static createInterface(): IEarningEngineVaultInterface {
      return new Interface(_abi) as IEarningEngineVaultInterface;
    }
    static connect(address: string, runner?: ContractRunner | null): IEarningEngineVault {
      return new Contract(address, _abi, runner) as unknown as IEarningEngineVault;
    }
  }
