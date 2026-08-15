import { Contract, Interface, type ContractRunner } from "ethers";
  import type { IActivationControllerHook, IActivationControllerHookInterface } from "../../OohdiesNFT.sol/IActivationControllerHook.js";

  const _abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "deactivateOnTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

  export class IActivationControllerHook__factory {
    static readonly abi = _abi;
    static createInterface(): IActivationControllerHookInterface {
      return new Interface(_abi) as IActivationControllerHookInterface;
    }
    static connect(address: string, runner?: ContractRunner | null): IActivationControllerHook {
      return new Contract(address, _abi, runner) as unknown as IActivationControllerHook;
    }
  }
