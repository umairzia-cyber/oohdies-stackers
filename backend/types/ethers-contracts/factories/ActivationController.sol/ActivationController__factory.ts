import type { Addressable } from "ethers";
import { Contract, ContractFactory, ContractTransactionResponse, Interface } from "ethers"
import type { Signer, BigNumberish, AddressLike, ContractDeployTransaction, ContractRunner } from "ethers"
import type { NonPayableOverrides } from "../../common.js"
  import type { ActivationController, ActivationControllerInterface } from "../../ActivationController.sol/ActivationController.js";

  const _abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oohdiesNFT",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_bananaToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_initialOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_activationCost",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ActivationCostNotSet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "AlreadyActivated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
    "type": "error"
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
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "NotNFTOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyNFTContractAllowed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddressNotAllowed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldCost",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newCost",
        "type": "uint256"
      }
    ],
    "name": "ActivationCostUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "earningEngine",
        "type": "address"
      }
    ],
    "name": "EarningEngineUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bananaBurned",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "activatedAtTimestamp",
        "type": "uint256"
      }
    ],
    "name": "NFTActivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      }
    ],
    "name": "NFTDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "activate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "activated",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "activatedAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "activationCost",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bananaToken",
    "outputs": [
      {
        "internalType": "contract IBurnableERC20",
        "name": "",
        "type": "address"
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
      }
    ],
    "name": "deactivateOnTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "earningEngine",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
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
      }
    ],
    "name": "getActivatedAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
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
      }
    ],
    "name": "isActivated",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oohdiesNFT",
    "outputs": [
      {
        "internalType": "contract IERC721",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newCost",
        "type": "uint256"
      }
    ],
    "name": "setActivationCost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_earningEngine",
        "type": "address"
      }
    ],
    "name": "setEarningEngine",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalActivated",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

  const _bytecode = "0x60c060405234801562000010575f80fd5b5060405162001826380380620018268339818101604052810190620000369190620003b9565b815f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603620000aa575f6040517f1e4fbdf7000000000000000000000000000000000000000000000000000000008152600401620000a1919062000439565b60405180910390fd5b620000bb816200022960201b60201c565b506001620000de620000d2620002ea60201b60201c565b6200031360201b60201c565b5f01819055505f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036200014a576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603620001b0576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8373ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250508273ffffffffffffffffffffffffffffffffffffffff1660a08173ffffffffffffffffffffffffffffffffffffffff1681525050806001819055505050505062000454565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6200034b8262000320565b9050919050565b6200035d816200033f565b811462000368575f80fd5b50565b5f815190506200037b8162000352565b92915050565b5f819050919050565b620003958162000381565b8114620003a0575f80fd5b50565b5f81519050620003b3816200038a565b92915050565b5f805f8060808587031215620003d457620003d36200031c565b5b5f620003e3878288016200036b565b9450506020620003f6878288016200036b565b935050604062000409878288016200036b565b92505060606200041c87828801620003a3565b91505092959194509250565b62000433816200033f565b82525050565b5f6020820190506200044e5f83018462000428565b92915050565b60805160a051611394620004925f395f818161067501526108b501525f818161036901528181610453015281816106c0015261070a01526113945ff3fe608060405234801561000f575f80fd5b506004361061011f575f3560e01c80638456cb59116100ab578063b260c42a1161006f578063b260c42a146102d1578063e8a12894146102ed578063f2fde38b14610309578063f6bb705614610325578063f6f718bf146103435761011f565b80638456cb591461023d5780638ca576c8146102475780638da5cb5b14610265578063a61c511314610283578063ae9ec3cc146102a15761011f565b80635c975abb116100f25780635c975abb146101a957806362428d19146101c7578063715018a6146101e55780637c59bf98146101ef57806381d114cc1461020d5761011f565b806325856a371461012357806331809dcf1461013f57806332fad9d81461016f5780633f4ba83a1461019f575b5f80fd5b61013d6004803603810190610138919061102f565b61035f565b005b6101596004803603810190610154919061102f565b61059f565b6040516101669190611074565b60405180910390f35b6101896004803603810190610184919061102f565b6105c5565b6040516101969190611074565b60405180910390f35b6101a76105e2565b005b6101b16105f4565b6040516101be9190611074565b60405180910390f35b6101cf610609565b6040516101dc91906110cc565b60405180910390f35b6101ed61062e565b005b6101f7610641565b60405161020491906110f4565b60405180910390f35b6102276004803603810190610222919061102f565b610647565b60405161023491906110f4565b60405180910390f35b610245610661565b005b61024f610673565b60405161025c9190611168565b60405180910390f35b61026d610697565b60405161027a91906110cc565b60405180910390f35b61028b6106be565b60405161029891906111a1565b60405180910390f35b6102bb60048036038101906102b6919061102f565b6106e2565b6040516102c891906110f4565b60405180910390f35b6102eb60048036038101906102e6919061102f565b6106f7565b005b6103076004803603810190610302919061102f565b610acb565b005b610323600480360381019061031e91906111e4565b610b1d565b005b61032d610ba1565b60405161033a91906110f4565b60405180910390f35b61035d600480360381019061035891906111e4565b610ba7565b005b610367610c9a565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16141580156103f657506103c6610697565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614155b1561042d576040517f57b0388500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60035f8281526020019081526020015f205f9054906101000a900460ff1615610594575f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16636352211e836040518263ffffffff1660e01b81526004016104aa91906110f4565b602060405180830381865afa9250505080156104e457506040513d601f19601f820116820180604052508101906104e19190611223565b60015b156104ee57809150505b5f60035f8481526020019081526020015f205f6101000a81548160ff0219169083151502179055505f60045f8481526020019081526020015f20819055505f600554111561054e5760055f8154809291906105489061127b565b91905055505b8073ffffffffffffffffffffffffffffffffffffffff16827f59e375fc8580ee75d33f0892b0fd768b7764e6cf983b6114eb309627457b00c160405160405180910390a3505b61059c610cbc565b50565b5f60035f8381526020019081526020015f205f9054906101000a900460ff169050919050565b6003602052805f5260405f205f915054906101000a900460ff1681565b6105ea610cd6565b6105f2610d5d565b565b5f8060149054906101000a900460ff16905090565b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b610636610cd6565b61063f5f610dbe565b565b60055481565b5f60045f8381526020019081526020015f20549050919050565b610669610cd6565b610671610e7f565b565b7f000000000000000000000000000000000000000000000000000000000000000081565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b7f000000000000000000000000000000000000000000000000000000000000000081565b6004602052805f5260405f205f915090505481565b6106ff610c9a565b610707610ee1565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16636352211e836040518263ffffffff1660e01b815260040161076191906110f4565b602060405180830381865afa15801561077c573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906107a09190611223565b90503373ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146108145781336040517fe69ff3a300000000000000000000000000000000000000000000000000000000815260040161080b9291906112a2565b60405180910390fd5b60035f8381526020019081526020015f205f9054906101000a900460ff161561087457816040517f93a84e2d00000000000000000000000000000000000000000000000000000000815260040161086b91906110f4565b60405180910390fd5b5f60015490505f81036108b3576040517f6226dc7200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166379cc679033836040518363ffffffff1660e01b815260040161090e9291906112c9565b5f604051808303815f87803b158015610925575f80fd5b505af1158015610937573d5f803e3d5ffd5b505050505f73ffffffffffffffffffffffffffffffffffffffff1660025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614610a175760025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166366cf747f846040518263ffffffff1660e01b81526004016109e991906110f4565b5f604051808303815f87803b158015610a00575f80fd5b505af1158015610a12573d5f803e3d5ffd5b505050505b600160035f8581526020019081526020015f205f6101000a81548160ff0219169083151502179055504260045f8581526020019081526020015f208190555060055f815480929190610a68906112f0565b91905055503373ffffffffffffffffffffffffffffffffffffffff16837f8710f14aa2b4a71a7d67112aa464e6d3085e19eac2cfe1deaac06eed77d02a128342604051610ab6929190611337565b60405180910390a35050610ac8610cbc565b50565b610ad3610cd6565b5f6001549050816001819055507fd00034c36e8410d608c84aa24dfafacc2e429e453d4e3eb072cfb0c19ac9e34a8183604051610b11929190611337565b60405180910390a15050565b610b25610cd6565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610b95575f6040517f1e4fbdf7000000000000000000000000000000000000000000000000000000008152600401610b8c91906110cc565b60405180910390fd5b610b9e81610dbe565b50565b60015481565b610baf610cd6565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610c14576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8060025f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508073ffffffffffffffffffffffffffffffffffffffff167fbdcc8e7bf7826d703dacf7898ad49bd649eed4c1cc0812e3f38805bd412839bd60405160405180910390a250565b610ca2610f22565b6002610cb4610caf610f63565b610f8c565b5f0181905550565b6001610cce610cc9610f63565b610f8c565b5f0181905550565b610cde610f95565b73ffffffffffffffffffffffffffffffffffffffff16610cfc610697565b73ffffffffffffffffffffffffffffffffffffffff1614610d5b57610d1f610f95565b6040517f118cdaa7000000000000000000000000000000000000000000000000000000008152600401610d5291906110cc565b60405180910390fd5b565b610d65610f9c565b5f8060146101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa610da7610f95565b604051610db491906110cc565b60405180910390a1565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b610e87610ee1565b60015f60146101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258610eca610f95565b604051610ed791906110cc565b60405180910390a1565b610ee96105f4565b15610f20576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b610f2a610fdc565b15610f61576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f33905090565b610fa46105f4565b610fda576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f6002610fef610fea610f63565b610f8c565b5f015414905090565b5f80fd5b5f819050919050565b61100e81610ffc565b8114611018575f80fd5b50565b5f8135905061102981611005565b92915050565b5f6020828403121561104457611043610ff8565b5b5f6110518482850161101b565b91505092915050565b5f8115159050919050565b61106e8161105a565b82525050565b5f6020820190506110875f830184611065565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6110b68261108d565b9050919050565b6110c6816110ac565b82525050565b5f6020820190506110df5f8301846110bd565b92915050565b6110ee81610ffc565b82525050565b5f6020820190506111075f8301846110e5565b92915050565b5f819050919050565b5f61113061112b6111268461108d565b61110d565b61108d565b9050919050565b5f61114182611116565b9050919050565b5f61115282611137565b9050919050565b61116281611148565b82525050565b5f60208201905061117b5f830184611159565b92915050565b5f61118b82611137565b9050919050565b61119b81611181565b82525050565b5f6020820190506111b45f830184611192565b92915050565b6111c3816110ac565b81146111cd575f80fd5b50565b5f813590506111de816111ba565b92915050565b5f602082840312156111f9576111f8610ff8565b5b5f611206848285016111d0565b91505092915050565b5f8151905061121d816111ba565b92915050565b5f6020828403121561123857611237610ff8565b5b5f6112458482850161120f565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61128582610ffc565b91505f82036112975761129661124e565b5b600182039050919050565b5f6040820190506112b55f8301856110e5565b6112c260208301846110bd565b9392505050565b5f6040820190506112dc5f8301856110bd565b6112e960208301846110e5565b9392505050565b5f6112fa82610ffc565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361132c5761132b61124e565b5b600182019050919050565b5f60408201905061134a5f8301856110e5565b61135760208301846110e5565b939250505056fea2646970667358221220e9f2d84dbc3a6f1f59af800244a785652046a2e86698f704659bd7f0aa763eb864736f6c63430008180033";

      type ActivationControllerConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

      const isSuperArgs = (xs: ActivationControllerConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
        xs.length > 1

  export class ActivationController__factory extends ContractFactory {

      constructor(...args: ActivationControllerConstructorParams) {
        if (isSuperArgs(args)) {
          super(...args);
        } else {
          super(_abi, _bytecode, args[0]);
        }

      }

    override getDeployTransaction(_oohdiesNFT: AddressLike, _bananaToken: AddressLike, _initialOwner: AddressLike, _activationCost: BigNumberish, overrides?: NonPayableOverrides & { from?: string }): Promise<ContractDeployTransaction> {
      return super.getDeployTransaction(_oohdiesNFT, _bananaToken, _initialOwner, _activationCost, overrides || {});
    };
    override deploy(_oohdiesNFT: AddressLike, _bananaToken: AddressLike, _initialOwner: AddressLike, _activationCost: BigNumberish, overrides?: NonPayableOverrides & { from?: string }) {
      return super.deploy(_oohdiesNFT, _bananaToken, _initialOwner, _activationCost, overrides || {}) as Promise<ActivationController & {
        deploymentTransaction(): ContractTransactionResponse;
      }>;
    }
    override connect(runner: ContractRunner | null): ActivationController__factory {
      return super.connect(runner) as ActivationController__factory;
    }

    static readonly bytecode = _bytecode;
    static readonly abi = _abi;
    static createInterface(): ActivationControllerInterface {
      return new Interface(_abi) as ActivationControllerInterface;
    }

    override attach(address: string | Addressable): ActivationController {
      return super.attach(address) as ActivationController;
    }
  static connect(address: string, runner?: ContractRunner | null): ActivationController {
      return new Contract(address, _abi, runner) as unknown as ActivationController;
    }
  }
