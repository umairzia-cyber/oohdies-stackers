import type { Addressable } from "ethers";
import { Contract, ContractFactory, ContractTransactionResponse, Interface } from "ethers"
import type { Signer, AddressLike, ContractDeployTransaction, ContractRunner } from "ethers"
import type { NonPayableOverrides } from "../../common.js"
  import type { EarningEngine, EarningEngineInterface } from "../../EarningEngine.sol/EarningEngine.js";

  const _abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_activationController",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_oohdiesNFT",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "AssetAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "AssetNotRegistered",
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
    "inputs": [],
    "name": "OnlyActivationControllerAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyNFTContractAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyRewardVaultAllowed",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedFunder",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddressNotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAmountNotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroDurationNotAllowed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "funder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isFunder",
        "type": "bool"
      }
    ],
    "name": "FunderStatusUpdated",
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
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "NFTTransferSettled",
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
        "indexed": true,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      }
    ],
    "name": "RewardAssetRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "funder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardRate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "periodFinish",
        "type": "uint256"
      }
    ],
    "name": "RewardFunded",
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
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "accruedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "userIndex",
        "type": "uint256"
      }
    ],
    "name": "RewardUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldVault",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newVault",
        "type": "address"
      }
    ],
    "name": "RewardVaultUpdated",
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
    "inputs": [],
    "name": "PRECISION_FACTOR",
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
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "accruedRewards",
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
    "name": "activationController",
    "outputs": [
      {
        "internalType": "contract IActivationControllerView",
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
        "name": "claimable",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "name": "fundReward",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "getAccruedReward",
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
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "getPendingReward",
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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isFunder",
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
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isUserIndexInitialized",
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
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "lastTimeRewardApplicable",
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
    "name": "onNftActivation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "onNftTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "registerRewardAsset",
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
    "name": "registeredRewardAssets",
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
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "rewardAssets",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "rewardRate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdateTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "globalRewardIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "periodFinish",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalFunded",
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
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "rewardPerToken",
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
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "rewardPerTokenAtTimestamp",
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
    "name": "rewardVault",
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
        "internalType": "address",
        "name": "funder",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      }
    ],
    "name": "setFunder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_rewardVault",
        "type": "address"
      }
    ],
    "name": "setRewardVault",
    "outputs": [],
    "stateMutability": "nonpayable",
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
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "updateReward",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "updateRewardForAsset",
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
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userRewardIndex",
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

  const _bytecode = "0x60c060405234801562000010575f80fd5b50604051620037a8380380620037a8833981810160405281019062000036919062000379565b805f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603620000aa575f6040517f1e4fbdf7000000000000000000000000000000000000000000000000000000008152600401620000a19190620003e3565b60405180910390fd5b620000bb816200022160201b60201c565b506001620000de620000d2620002e260201b60201c565b6200030b60201b60201c565b5f01819055505f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036200014a576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603620001b0576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250508173ffffffffffffffffffffffffffffffffffffffff1660a08173ffffffffffffffffffffffffffffffffffffffff1681525050505050620003fe565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f620003438262000318565b9050919050565b620003558162000337565b811462000360575f80fd5b50565b5f8151905062000373816200034a565b92915050565b5f805f6060848603121562000393576200039262000314565b5b5f620003a28682870162000363565b9350506020620003b58682870162000363565b9250506040620003c88682870162000363565b9150509250925092565b620003dd8162000337565b82525050565b5f602082019050620003f85f830184620003d2565b92915050565b60805160a051613350620004585f395f8181610f4f015261149a01525f8181610c6e01528181610f18015281816112e2015281816115a601528181611a4d0152818161206d015281816127e3015261288801526133505ff3fe608060405234801561000f575f80fd5b50600436106101ee575f3560e01c80638125dd101161010d578063ba793b6c116100a0578063f12297771161006f578063f1229777146105ba578063f2fde38b146105ea578063f430bad114610606578063faaa3f0514610624576101ee565b8063ba793b6c14610520578063c59b1f3c14610550578063ccd34cd514610580578063e85074cc1461059e576101ee565b80638da5cb5b116100dc5780638da5cb5b146104845780638f61ccee146104a2578063a61c5113146104d2578063b8f8a382146104f0576101ee565b80638125dd10146103fe578063838fcb6f1461041a57806383c74c201461044a5780638456cb591461047a576101ee565b80635259d8521161018557806366cf747f1161015457806366cf747f1461039e5780636912e70e146103ba578063715018a6146103d85780637e5f1173146103e2576101ee565b80635259d8521461030457806353271f67146103205780635c975abb14610350578063638634ee1461036e576101ee565b80633a2c6777116101c15780633a2c6777146102a45780633f4ba83a146102c2578063425c8abd146102cc5780634a7c8ce6146102e8576101ee565b806309b433d0146101f25780630df12189146102285780631ea488701461024457806334496c4814610274575b5f80fd5b61020c60048036038101906102079190612b6a565b610654565b60405161021f9796959493929190612be2565b60405180910390f35b610242600480360381019061023d9190612c79565b6106aa565b005b61025e60048036038101906102599190612b6a565b6107bd565b60405161026b9190612cb7565b60405180910390f35b61028e60048036038101906102899190612cfa565b6107da565b60405161029b9190612d38565b60405180910390f35b6102ac6107fa565b6040516102b99190612d60565b60405180910390f35b6102ca61081f565b005b6102e660048036038101906102e19190612d79565b610831565b005b61030260048036038101906102fd9190612cfa565b6108a3565b005b61031e60048036038101906103199190612b6a565b6108b9565b005b61033a60048036038101906103359190612cfa565b610bc5565b6040516103479190612cb7565b60405180910390f35b610358610bef565b6040516103659190612cb7565b60405180910390f35b61038860048036038101906103839190612b6a565b610c04565b6040516103959190612d38565b60405180910390f35b6103b860048036038101906103b39190612d79565b610c64565b005b6103c2610f16565b6040516103cf9190612dff565b60405180910390f35b6103e0610f3a565b005b6103fc60048036038101906103f79190612e18565b610f4d565b005b61041860048036038101906104139190612b6a565b6110fb565b005b610434600480360381019061042f9190612cfa565b61122b565b6040516104419190612d38565b60405180910390f35b610464600480360381019061045f9190612e68565b611281565b6040516104719190612d38565b60405180910390f35b610482611424565b005b61048c611436565b6040516104999190612d60565b60405180910390f35b6104bc60048036038101906104b79190612d79565b61145d565b6040516104c99190612d60565b60405180910390f35b6104da611498565b6040516104e79190612ec6565b60405180910390f35b61050a60048036038101906105059190612cfa565b6114bc565b6040516105179190612d38565b60405180910390f35b61053a60048036038101906105359190612cfa565b6114dc565b6040516105479190612d38565b60405180910390f35b61056a60048036038101906105659190612cfa565b611546565b6040516105779190612d38565b60405180910390f35b6105886116ab565b6040516105959190612d38565b60405180910390f35b6105b860048036038101906105b39190612edf565b6116be565b005b6105d460048036038101906105cf9190612b6a565b6119ec565b6040516105e19190612d38565b60405180910390f35b61060460048036038101906105ff9190612b6a565b611b82565b005b61060e611c06565b60405161061b9190612fe6565b60405180910390f35b61063e60048036038101906106399190612cfa565b611c91565b60405161064b9190612d38565b60405180910390f35b6002602052805f5260405f205f91509050805f015f9054906101000a900460ff1690805f0160019054906101000a900460ff16908060010154908060020154908060030154908060040154908060050154905087565b6106b2611ed1565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610717576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8060035f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167fa1796a78f63570a60f2a7edb442e621396ab3ab1579f6402f237fba812e19a7b826040516107b19190612cb7565b60405180910390a25050565b6003602052805f5260405f205f915054906101000a900460ff1681565b6004602052815f5260405f20602052805f5260405f205f91509150505481565b60075f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b610827611ed1565b61082f611f58565b565b610839611fb9565b5f60018054905090505f5b8181101561089e57610891836001838154811061086457610863613006565b5b905f5260205f20015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16611ffa565b8080600101915050610844565b505050565b6108ab611fb9565b6108b58282611ffa565b5050565b6108c1611ed1565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610926576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f8273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f015f9054906101000a900460ff16156109b457806040517f9690e53c0000000000000000000000000000000000000000000000000000000081526004016109ab9190612d60565b60405180910390fd5b5f601290508173ffffffffffffffffffffffffffffffffffffffff1663313ce5676040518163ffffffff1660e01b8152600401602060405180830381865afa925050508015610a2157506040513d601f19601f82011682018060405250810190610a1e919061305d565b60015b15610a2b57809150505b6040518060e001604052806001151581526020018260ff1681526020015f81526020014281526020015f81526020015f81526020015f81525060025f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548160ff0219169083151502179055506020820151815f0160016101000a81548160ff021916908360ff16021790555060408201518160010155606082015181600201556080820151816003015560a0820151816004015560c08201518160050155905050600182908060018154018082558091505060019003905f5260205f20015f9091909190916101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff167f1221047dd6c95c23ec8adef15519fbea3854dedea824c638d0bf63ebf0f972e382604051610bb99190613088565b60405180910390a25050565b6006602052815f5260405f20602052805f5260405f205f915091509054906101000a900460ff1681565b5f8060149054906101000a900460ff16905090565b5f8060025f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905080600401544210610c5a578060040154610c5c565b425b915050919050565b610c6c611fb9565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610cf1576040517fe98382cd00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f60018054905090505f5b81811015610f11575f60018281548110610d1957610d18613006565b5b905f5260205f20015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690505f60025f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff16610d9e575050610f04565b610da78261258a565b806003015460045f8781526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550600160065f8781526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff16857fcef61857dd0d59ff2430e32bd68bcb12f54fdf78e39ec7b8040300de1bd66a7c60055f8981526020019081526020015f205f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20548460030154604051610ef99291906130a1565b60405180910390a350505b8080600101915050610cfc565b505050565b7f000000000000000000000000000000000000000000000000000000000000000081565b610f42611ed1565b610f4b5f61260b565b565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610fd2576040517f57b0388500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610fdb81610831565b5f60018054905090505f5b81811015611099575f60065f8581526020019081526020015f205f6001848154811061101557611014613006565b5b905f5260205f20015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508080600101915050610fe6565b508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16837f778bc1f8a4a8f1cbd6f35b6172677435e5fcd13dd72b66e5362a11fe8133334c60405160405180910390a450505050565b611103611ed1565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611168576040517f8579befe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f60075f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690508160075f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f50c4b70d6930a0ddb31141c9f3d782f76f37a85f858722d60d5b0203939cbfa360405160405180910390a35050565b5f60055f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b5f8060025f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166112df575f91505061141e565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16637c59bf986040518163ffffffff1660e01b8152600401602060405180830381865afa158015611349573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061136d91906130dc565b90505f81036113845781600301549250505061141e565b5f849050826004015481111561139c57826004015490505b826002015481116113b6578260030154935050505061141e565b5f8360020154826113c79190613134565b90505f8460010154826113da9190613167565b90505f846ec097ce7bc90715b34b9f1000000000836113f99190613167565b61140391906131d5565b90508086600301546114159190613205565b96505050505050505b92915050565b61142c611ed1565b6114346126cc565b565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6001818154811061146c575f80fd5b905f5260205f20015f915054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b7f000000000000000000000000000000000000000000000000000000000000000081565b6005602052815f5260405f20602052805f5260405f205f91509150505481565b5f6114e78383611546565b60055f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205461153e9190613205565b905092915050565b5f8060025f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166115a4575f9150506116a5565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166331809dcf856040518263ffffffff1660e01b81526004016115fd9190612d38565b602060405180830381865afa158015611618573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061163c919061324c565b611649575f9150506116a5565b5f611653846119ec565b90505f611660868661272e565b9050808211611674575f93505050506116a5565b5f81836116819190613134565b90506ec097ce7bc90715b34b9f10000000008161169e91906131d5565b9450505050505b92915050565b6ec097ce7bc90715b34b9f100000000081565b60035f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff161580156117485750611718611436565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614155b1561177f576040517f5e9ea87700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b611787611fb9565b61178f612934565b5f82036117c8576040517f0f43956a00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f8103611801576040517f4cf5381300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f60025f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff1661189257836040517f1a2a9e870000000000000000000000000000000000000000000000000000000081526004016118899190612d60565b60405180910390fd5b61189b8461258a565b6118c83330858773ffffffffffffffffffffffffffffffffffffffff16612956909392919063ffffffff16565b806004015442106118ec5781836118df91906131d5565b8160010181905550611934565b5f4282600401546118fd9190613134565b90505f8260010154826119109190613167565b905083818661191f9190613205565b61192991906131d5565b836001018190555050505b42816002018190555081426119499190613205565b816004018190555082816005015f8282546119649190613205565b925050819055503373ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f719d3601ad9d526c007253eb60024b573a3290655c69d0a1974f766f72a3678e8585856001015486600401546040516119d69493929190613277565b60405180910390a3506119e76129ab565b505050565b5f8060025f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff16611a4a575f915050611b7d565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16637c59bf986040518163ffffffff1660e01b8152600401602060405180830381865afa158015611ab4573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611ad891906130dc565b90505f8103611aef57816003015492505050611b7d565b5f611af985610c04565b905082600201548111611b155782600301549350505050611b7d565b5f836002015482611b269190613134565b90505f846001015482611b399190613167565b90505f846ec097ce7bc90715b34b9f100000000083611b589190613167565b611b6291906131d5565b9050808660030154611b749190613205565b96505050505050505b919050565b611b8a611ed1565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611bfa575f6040517f1e4fbdf7000000000000000000000000000000000000000000000000000000008152600401611bf19190612d60565b60405180910390fd5b611c038161260b565b50565b60606001805480602002602001604051908101604052809291908181526020018280548015611c8757602002820191905f5260205f20905b815f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019060010190808311611c3e575b5050505050905090565b5f611c9a611fb9565b5f73ffffffffffffffffffffffffffffffffffffffff1660075f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614158015611d44575060075f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614155b15611d7b576040517fc738eb3200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b611d858383611ffa565b60055f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490505f811115611ecb575f60055f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508173ffffffffffffffffffffffffffffffffffffffff16837fcef61857dd0d59ff2430e32bd68bcb12f54fdf78e39ec7b8040300de1bd66a7c5f60045f8881526020019081526020015f205f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054604051611ec29291906132f3565b60405180910390a35b92915050565b611ed96129c5565b73ffffffffffffffffffffffffffffffffffffffff16611ef7611436565b73ffffffffffffffffffffffffffffffffffffffff1614611f5657611f1a6129c5565b6040517f118cdaa7000000000000000000000000000000000000000000000000000000008152600401611f4d9190612d60565b60405180910390fd5b565b611f606129cc565b5f8060146101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa611fa26129c5565b604051611faf9190612d60565b60405180910390a1565b611fc1610bef565b15611ff8576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f60025f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166120545750612586565b5f61205f848461272e565b905061206a8361258a565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166331809dcf866040518263ffffffff1660e01b81526004016120c49190612d38565b602060405180830381865afa1580156120df573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190612103919061324c565b9050806122d55760065f8681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612278575f8360030154905082811115612213575f83826121859190613134565b90505f6ec097ce7bc90715b34b9f1000000000826121a391906131d5565b90505f811115612210578060055f8a81526020019081526020015f205f8973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546122089190613205565b925050819055505b50505b5f60065f8881526020019081526020015f205f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550505b826003015460045f8781526020019081526020015f205f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505050612586565b5f8360030154905060065f8781526020019081526020015f205f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff166123f0578260045f8881526020019081526020015f205f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550600160065f8881526020019081526020015f205f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055505b82811115612581575f83826124059190613134565b90505f6ec097ce7bc90715b34b9f10000000008261242391906131d5565b90505f811115612490578060055f8a81526020019081526020015f205f8973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546124889190613205565b925050819055505b8260045f8a81526020019081526020015f205f8973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508673ffffffffffffffffffffffffffffffffffffffff16887fcef61857dd0d59ff2430e32bd68bcb12f54fdf78e39ec7b8040300de1bd66a7c60055f8c81526020019081526020015f205f8b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054866040516125769291906130a1565b60405180910390a350505b505050505b5050565b5f60025f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166125e45750612608565b6125ed826119ec565b81600301819055506125fe82610c04565b8160020181905550505b50565b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b6126d4611fb9565b60015f60146101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586127176129c5565b6040516127249190612d60565b60405180910390a1565b5f60065f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16156127e15760045f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905061292e565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166331809dcf846040518263ffffffff1660e01b815260040161283a9190612d38565b602060405180830381865afa158015612855573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190612879919061324c565b612885575f905061292e565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166381d114cc856040518263ffffffff1660e01b81526004016128df9190612d38565b602060405180830381865afa1580156128fa573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061291e91906130dc565b905061292a8382611281565b9150505b92915050565b61293c612a0c565b600261294e612949612a4d565b612a76565b5f0181905550565b612964848484846001612a7f565b6129a557836040517f5274afe700000000000000000000000000000000000000000000000000000000815260040161299c9190612d60565b60405180910390fd5b50505050565b60016129bd6129b8612a4d565b612a76565b5f0181905550565b5f33905090565b6129d4610bef565b612a0a576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b612a14612af0565b15612a4b576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f806323b872dd60e01b9050604051815f525f1960601c87166004525f1960601c86166024528460445260205f60645f808c5af1925060015f51148316612add578383151615612ad1573d5f823e3d81fd5b5f883b113d1516831692505b806040525f606052505095945050505050565b5f6002612b03612afe612a4d565b612a76565b5f015414905090565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f612b3982612b10565b9050919050565b612b4981612b2f565b8114612b53575f80fd5b50565b5f81359050612b6481612b40565b92915050565b5f60208284031215612b7f57612b7e612b0c565b5b5f612b8c84828501612b56565b91505092915050565b5f8115159050919050565b612ba981612b95565b82525050565b5f60ff82169050919050565b612bc481612baf565b82525050565b5f819050919050565b612bdc81612bca565b82525050565b5f60e082019050612bf55f83018a612ba0565b612c026020830189612bbb565b612c0f6040830188612bd3565b612c1c6060830187612bd3565b612c296080830186612bd3565b612c3660a0830185612bd3565b612c4360c0830184612bd3565b98975050505050505050565b612c5881612b95565b8114612c62575f80fd5b50565b5f81359050612c7381612c4f565b92915050565b5f8060408385031215612c8f57612c8e612b0c565b5b5f612c9c85828601612b56565b9250506020612cad85828601612c65565b9150509250929050565b5f602082019050612cca5f830184612ba0565b92915050565b612cd981612bca565b8114612ce3575f80fd5b50565b5f81359050612cf481612cd0565b92915050565b5f8060408385031215612d1057612d0f612b0c565b5b5f612d1d85828601612ce6565b9250506020612d2e85828601612b56565b9150509250929050565b5f602082019050612d4b5f830184612bd3565b92915050565b612d5a81612b2f565b82525050565b5f602082019050612d735f830184612d51565b92915050565b5f60208284031215612d8e57612d8d612b0c565b5b5f612d9b84828501612ce6565b91505092915050565b5f819050919050565b5f612dc7612dc2612dbd84612b10565b612da4565b612b10565b9050919050565b5f612dd882612dad565b9050919050565b5f612de982612dce565b9050919050565b612df981612ddf565b82525050565b5f602082019050612e125f830184612df0565b92915050565b5f805f60608486031215612e2f57612e2e612b0c565b5b5f612e3c86828701612b56565b9350506020612e4d86828701612b56565b9250506040612e5e86828701612ce6565b9150509250925092565b5f8060408385031215612e7e57612e7d612b0c565b5b5f612e8b85828601612b56565b9250506020612e9c85828601612ce6565b9150509250929050565b5f612eb082612dce565b9050919050565b612ec081612ea6565b82525050565b5f602082019050612ed95f830184612eb7565b92915050565b5f805f60608486031215612ef657612ef5612b0c565b5b5f612f0386828701612b56565b9350506020612f1486828701612ce6565b9250506040612f2586828701612ce6565b9150509250925092565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b612f6181612b2f565b82525050565b5f612f728383612f58565b60208301905092915050565b5f602082019050919050565b5f612f9482612f2f565b612f9e8185612f39565b9350612fa983612f49565b805f5b83811015612fd9578151612fc08882612f67565b9750612fcb83612f7e565b925050600181019050612fac565b5085935050505092915050565b5f6020820190508181035f830152612ffe8184612f8a565b905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b61303c81612baf565b8114613046575f80fd5b50565b5f8151905061305781613033565b92915050565b5f6020828403121561307257613071612b0c565b5b5f61307f84828501613049565b91505092915050565b5f60208201905061309b5f830184612bbb565b92915050565b5f6040820190506130b45f830185612bd3565b6130c16020830184612bd3565b9392505050565b5f815190506130d681612cd0565b92915050565b5f602082840312156130f1576130f0612b0c565b5b5f6130fe848285016130c8565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61313e82612bca565b915061314983612bca565b925082820390508181111561316157613160613107565b5b92915050565b5f61317182612bca565b915061317c83612bca565b925082820261318a81612bca565b915082820484148315176131a1576131a0613107565b5b5092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f6131df82612bca565b91506131ea83612bca565b9250826131fa576131f96131a8565b5b828204905092915050565b5f61320f82612bca565b915061321a83612bca565b925082820190508082111561323257613231613107565b5b92915050565b5f8151905061324681612c4f565b92915050565b5f6020828403121561326157613260612b0c565b5b5f61326e84828501613238565b91505092915050565b5f60808201905061328a5f830187612bd3565b6132976020830186612bd3565b6132a46040830185612bd3565b6132b16060830184612bd3565b95945050505050565b5f819050919050565b5f6132dd6132d86132d3846132ba565b612da4565b612bca565b9050919050565b6132ed816132c3565b82525050565b5f6040820190506133065f8301856132e4565b6133136020830184612bd3565b939250505056fea26469706673582212202c177e10e55596ef74e3f44f1d29272f6895d8f08096e14a0aeba09c217e430d64736f6c63430008180033";

      type EarningEngineConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

      const isSuperArgs = (xs: EarningEngineConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
        xs.length > 1

  export class EarningEngine__factory extends ContractFactory {

      constructor(...args: EarningEngineConstructorParams) {
        if (isSuperArgs(args)) {
          super(...args);
        } else {
          super(_abi, _bytecode, args[0]);
        }

      }

    override getDeployTransaction(_activationController: AddressLike, _oohdiesNFT: AddressLike, _initialOwner: AddressLike, overrides?: NonPayableOverrides & { from?: string }): Promise<ContractDeployTransaction> {
      return super.getDeployTransaction(_activationController, _oohdiesNFT, _initialOwner, overrides || {});
    };
    override deploy(_activationController: AddressLike, _oohdiesNFT: AddressLike, _initialOwner: AddressLike, overrides?: NonPayableOverrides & { from?: string }) {
      return super.deploy(_activationController, _oohdiesNFT, _initialOwner, overrides || {}) as Promise<EarningEngine & {
        deploymentTransaction(): ContractTransactionResponse;
      }>;
    }
    override connect(runner: ContractRunner | null): EarningEngine__factory {
      return super.connect(runner) as EarningEngine__factory;
    }

    static readonly bytecode = _bytecode;
    static readonly abi = _abi;
    static createInterface(): EarningEngineInterface {
      return new Interface(_abi) as EarningEngineInterface;
    }

    override attach(address: string | Addressable): EarningEngine {
      return super.attach(address) as EarningEngine;
    }
  static connect(address: string, runner?: ContractRunner | null): EarningEngine {
      return new Contract(address, _abi, runner) as unknown as EarningEngine;
    }
  }
