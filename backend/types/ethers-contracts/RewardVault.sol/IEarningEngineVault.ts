import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedListener, TypedContractMethod } from "../common.js"

  export interface IEarningEngineVaultInterface extends Interface {
    getFunction(nameOrSignature: "deductClaimableReward" | "getRegisteredRewardAssets" | "getTotalClaimableReward"): FunctionFragment;

    encodeFunctionData(functionFragment: 'deductClaimableReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'getRegisteredRewardAssets', values?: undefined): string;
encodeFunctionData(functionFragment: 'getTotalClaimableReward', values: [BigNumberish, AddressLike]): string;

    decodeFunctionResult(functionFragment: 'deductClaimableReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getRegisteredRewardAssets', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getTotalClaimableReward', data: BytesLike): Result;
  }

  export interface IEarningEngineVault extends BaseContract {

    connect(runner?: ContractRunner | null): IEarningEngineVault;
    waitForDeployment(): Promise<this>;

    interface: IEarningEngineVaultInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TypedEventLog<TCEvent>>>
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>
  on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>

  once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>
  once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>
  removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>

    deductClaimableReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'nonpayable'
    >

    getRegisteredRewardAssets: TypedContractMethod<
      [],
      [string[]],
      'view'
    >

    getTotalClaimableReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'deductClaimableReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'getRegisteredRewardAssets'): TypedContractMethod<
      [],
      [string[]],
      'view'
    >;
getFunction(nameOrSignature: 'getTotalClaimableReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
    >;

    filters: {

    };
  }
