import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../common.js"

  export interface RewardVaultInterface extends Interface {
    getFunction(nameOrSignature: "claimAllRewards" | "claimReward" | "depositReward" | "earningEngine" | "getVaultBalance" | "oohdiesNFT" | "owner" | "pause" | "paused" | "renounceOwnership" | "totalClaimed" | "totalDeposited" | "transferOwnership" | "unpause"): FunctionFragment;

    getEvent(nameOrSignatureOrTopic: "OwnershipTransferred" | "Paused" | "RewardClaimed" | "RewardDeposited" | "Unpaused"): EventFragment;

    encodeFunctionData(functionFragment: 'claimAllRewards', values: [BigNumberish]): string;
encodeFunctionData(functionFragment: 'claimReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'depositReward', values: [AddressLike, BigNumberish]): string;
encodeFunctionData(functionFragment: 'earningEngine', values?: undefined): string;
encodeFunctionData(functionFragment: 'getVaultBalance', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'oohdiesNFT', values?: undefined): string;
encodeFunctionData(functionFragment: 'owner', values?: undefined): string;
encodeFunctionData(functionFragment: 'pause', values?: undefined): string;
encodeFunctionData(functionFragment: 'paused', values?: undefined): string;
encodeFunctionData(functionFragment: 'renounceOwnership', values?: undefined): string;
encodeFunctionData(functionFragment: 'totalClaimed', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'totalDeposited', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'transferOwnership', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'unpause', values?: undefined): string;

    decodeFunctionResult(functionFragment: 'claimAllRewards', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'claimReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'depositReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'earningEngine', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getVaultBalance', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'oohdiesNFT', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'owner', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'pause', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'paused', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'renounceOwnership', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'totalClaimed', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'totalDeposited', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'transferOwnership', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'unpause', data: BytesLike): Result;
  }

    export namespace OwnershipTransferredEvent {
      export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
      export type OutputTuple = [previousOwner: string, newOwner: string];
      export interface OutputObject {previousOwner: string, newOwner: string };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace PausedEvent {
      export type InputTuple = [account: AddressLike];
      export type OutputTuple = [account: string];
      export interface OutputObject {account: string };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace RewardClaimedEvent {
      export type InputTuple = [tokenId: BigNumberish, asset: AddressLike, recipient: AddressLike, amount: BigNumberish];
      export type OutputTuple = [tokenId: bigint, asset: string, recipient: string, amount: bigint];
      export interface OutputObject {tokenId: bigint, asset: string, recipient: string, amount: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace RewardDepositedEvent {
      export type InputTuple = [asset: AddressLike, depositor: AddressLike, amount: BigNumberish];
      export type OutputTuple = [asset: string, depositor: string, amount: bigint];
      export interface OutputObject {asset: string, depositor: string, amount: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace UnpausedEvent {
      export type InputTuple = [account: AddressLike];
      export type OutputTuple = [account: string];
      export interface OutputObject {account: string };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

  export interface RewardVault extends BaseContract {

    connect(runner?: ContractRunner | null): RewardVault;
    waitForDeployment(): Promise<this>;

    interface: RewardVaultInterface;

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

    claimAllRewards: TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    claimReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [void],
      'nonpayable'
    >

    depositReward: TypedContractMethod<
      [asset: AddressLike, amount: BigNumberish, ],
      [void],
      'nonpayable'
    >

    earningEngine: TypedContractMethod<
      [],
      [string],
      'view'
    >

    getVaultBalance: TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >

    oohdiesNFT: TypedContractMethod<
      [],
      [string],
      'view'
    >

    owner: TypedContractMethod<
      [],
      [string],
      'view'
    >

    pause: TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >

    paused: TypedContractMethod<
      [],
      [boolean],
      'view'
    >

    renounceOwnership: TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >

    totalClaimed: TypedContractMethod<
      [arg0: AddressLike, ],
      [bigint],
      'view'
    >

    totalDeposited: TypedContractMethod<
      [arg0: AddressLike, ],
      [bigint],
      'view'
    >

    transferOwnership: TypedContractMethod<
      [newOwner: AddressLike, ],
      [void],
      'nonpayable'
    >

    unpause: TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'claimAllRewards'): TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'claimReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'depositReward'): TypedContractMethod<
      [asset: AddressLike, amount: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'earningEngine'): TypedContractMethod<
      [],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'getVaultBalance'): TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'oohdiesNFT'): TypedContractMethod<
      [],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'owner'): TypedContractMethod<
      [],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'pause'): TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'paused'): TypedContractMethod<
      [],
      [boolean],
      'view'
    >;
getFunction(nameOrSignature: 'renounceOwnership'): TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'totalClaimed'): TypedContractMethod<
      [arg0: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'totalDeposited'): TypedContractMethod<
      [arg0: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'transferOwnership'): TypedContractMethod<
      [newOwner: AddressLike, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'unpause'): TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >;

    getEvent(key: 'OwnershipTransferred'): TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;
getEvent(key: 'Paused'): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
getEvent(key: 'RewardClaimed'): TypedContractEvent<RewardClaimedEvent.InputTuple, RewardClaimedEvent.OutputTuple, RewardClaimedEvent.OutputObject>;
getEvent(key: 'RewardDeposited'): TypedContractEvent<RewardDepositedEvent.InputTuple, RewardDepositedEvent.OutputTuple, RewardDepositedEvent.OutputObject>;
getEvent(key: 'Unpaused'): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;

    filters: {

      'OwnershipTransferred(address,address)': TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;
      OwnershipTransferred: TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;

      'Paused(address)': TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
      Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;

      'RewardClaimed(uint256,address,address,uint256)': TypedContractEvent<RewardClaimedEvent.InputTuple, RewardClaimedEvent.OutputTuple, RewardClaimedEvent.OutputObject>;
      RewardClaimed: TypedContractEvent<RewardClaimedEvent.InputTuple, RewardClaimedEvent.OutputTuple, RewardClaimedEvent.OutputObject>;

      'RewardDeposited(address,address,uint256)': TypedContractEvent<RewardDepositedEvent.InputTuple, RewardDepositedEvent.OutputTuple, RewardDepositedEvent.OutputObject>;
      RewardDeposited: TypedContractEvent<RewardDepositedEvent.InputTuple, RewardDepositedEvent.OutputTuple, RewardDepositedEvent.OutputObject>;

      'Unpaused(address)': TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
      Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;

    };
  }
