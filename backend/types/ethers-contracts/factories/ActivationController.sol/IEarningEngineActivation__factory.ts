import { Contract, Interface, type ContractRunner } from "ethers";
  import type { IEarningEngineActivation, IEarningEngineActivationInterface } from "../../ActivationController.sol/IEarningEngineActivation.js";

  const _abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "onNftActivation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

  export class IEarningEngineActivation__factory {
    static readonly abi = _abi;
    static createInterface(): IEarningEngineActivationInterface {
      return new Interface(_abi) as IEarningEngineActivationInterface;
    }
    static connect(address: string, runner?: ContractRunner | null): IEarningEngineActivation {
      return new Contract(address, _abi, runner) as unknown as IEarningEngineActivation;
    }
  }
