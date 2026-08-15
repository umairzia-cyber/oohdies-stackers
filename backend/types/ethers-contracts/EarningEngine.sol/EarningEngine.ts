import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../common.js"

  export interface EarningEngineInterface extends Interface {
    getFunction(nameOrSignature: "PRECISION_FACTOR" | "accruedRewards" | "activationController" | "deductClaimableReward" | "fundReward" | "getAccruedReward" | "getPendingReward" | "getRegisteredRewardAssets" | "getTotalClaimableReward" | "isFunder" | "isUserIndexInitialized" | "lastTimeRewardApplicable" | "onNftActivation" | "onNftTransfer" | "oohdiesNFT" | "owner" | "pause" | "paused" | "registerRewardAsset" | "registeredRewardAssets" | "renounceOwnership" | "rewardAssets" | "rewardPerToken" | "rewardPerTokenAtTimestamp" | "rewardVault" | "setFunder" | "setRewardVault" | "transferOwnership" | "unpause" | "updateReward" | "updateRewardForAsset" | "userRewardIndex"): FunctionFragment;

    getEvent(nameOrSignatureOrTopic: "FunderStatusUpdated" | "NFTTransferSettled" | "OwnershipTransferred" | "Paused" | "RewardAssetRegistered" | "RewardFunded" | "RewardUpdated" | "RewardVaultUpdated" | "Unpaused"): EventFragment;

    encodeFunctionData(functionFragment: 'PRECISION_FACTOR', values?: undefined): string;
encodeFunctionData(functionFragment: 'accruedRewards', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'activationController', values?: undefined): string;
encodeFunctionData(functionFragment: 'deductClaimableReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'fundReward', values: [AddressLike, BigNumberish, BigNumberish]): string;
encodeFunctionData(functionFragment: 'getAccruedReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'getPendingReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'getRegisteredRewardAssets', values?: undefined): string;
encodeFunctionData(functionFragment: 'getTotalClaimableReward', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'isFunder', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'isUserIndexInitialized', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'lastTimeRewardApplicable', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'onNftActivation', values: [BigNumberish]): string;
encodeFunctionData(functionFragment: 'onNftTransfer', values: [AddressLike, AddressLike, BigNumberish]): string;
encodeFunctionData(functionFragment: 'oohdiesNFT', values?: undefined): string;
encodeFunctionData(functionFragment: 'owner', values?: undefined): string;
encodeFunctionData(functionFragment: 'pause', values?: undefined): string;
encodeFunctionData(functionFragment: 'paused', values?: undefined): string;
encodeFunctionData(functionFragment: 'registerRewardAsset', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'registeredRewardAssets', values: [BigNumberish]): string;
encodeFunctionData(functionFragment: 'renounceOwnership', values?: undefined): string;
encodeFunctionData(functionFragment: 'rewardAssets', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'rewardPerToken', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'rewardPerTokenAtTimestamp', values: [AddressLike, BigNumberish]): string;
encodeFunctionData(functionFragment: 'rewardVault', values?: undefined): string;
encodeFunctionData(functionFragment: 'setFunder', values: [AddressLike, boolean]): string;
encodeFunctionData(functionFragment: 'setRewardVault', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'transferOwnership', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'unpause', values?: undefined): string;
encodeFunctionData(functionFragment: 'updateReward', values: [BigNumberish]): string;
encodeFunctionData(functionFragment: 'updateRewardForAsset', values: [BigNumberish, AddressLike]): string;
encodeFunctionData(functionFragment: 'userRewardIndex', values: [BigNumberish, AddressLike]): string;

    decodeFunctionResult(functionFragment: 'PRECISION_FACTOR', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'accruedRewards', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'activationController', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'deductClaimableReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'fundReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getAccruedReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getPendingReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getRegisteredRewardAssets', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'getTotalClaimableReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'isFunder', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'isUserIndexInitialized', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'lastTimeRewardApplicable', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'onNftActivation', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'onNftTransfer', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'oohdiesNFT', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'owner', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'pause', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'paused', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'registerRewardAsset', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'registeredRewardAssets', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'renounceOwnership', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'rewardAssets', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'rewardPerToken', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'rewardPerTokenAtTimestamp', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'rewardVault', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'setFunder', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'setRewardVault', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'transferOwnership', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'unpause', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'updateReward', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'updateRewardForAsset', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'userRewardIndex', data: BytesLike): Result;
  }

    export namespace FunderStatusUpdatedEvent {
      export type InputTuple = [funder: AddressLike, isFunder: boolean];
      export type OutputTuple = [funder: string, isFunder: boolean];
      export interface OutputObject {funder: string, isFunder: boolean };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace NFTTransferSettledEvent {
      export type InputTuple = [tokenId: BigNumberish, from: AddressLike, to: AddressLike];
      export type OutputTuple = [tokenId: bigint, from: string, to: string];
      export interface OutputObject {tokenId: bigint, from: string, to: string };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
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

    export namespace RewardAssetRegisteredEvent {
      export type InputTuple = [asset: AddressLike, decimals: BigNumberish];
      export type OutputTuple = [asset: string, decimals: bigint];
      export interface OutputObject {asset: string, decimals: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace RewardFundedEvent {
      export type InputTuple = [asset: AddressLike, funder: AddressLike, amount: BigNumberish, duration: BigNumberish, rewardRate: BigNumberish, periodFinish: BigNumberish];
      export type OutputTuple = [asset: string, funder: string, amount: bigint, duration: bigint, rewardRate: bigint, periodFinish: bigint];
      export interface OutputObject {asset: string, funder: string, amount: bigint, duration: bigint, rewardRate: bigint, periodFinish: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace RewardUpdatedEvent {
      export type InputTuple = [tokenId: BigNumberish, asset: AddressLike, accruedAmount: BigNumberish, userIndex: BigNumberish];
      export type OutputTuple = [tokenId: bigint, asset: string, accruedAmount: bigint, userIndex: bigint];
      export interface OutputObject {tokenId: bigint, asset: string, accruedAmount: bigint, userIndex: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
      export type Filter = TypedDeferredTopicFilter<Event>
      export type Log = TypedEventLog<Event>
      export type LogDescription = TypedLogDescription<Event>
    }

    export namespace RewardVaultUpdatedEvent {
      export type InputTuple = [oldVault: AddressLike, newVault: AddressLike];
      export type OutputTuple = [oldVault: string, newVault: string];
      export interface OutputObject {oldVault: string, newVault: string };
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

  export interface EarningEngine extends BaseContract {

    connect(runner?: ContractRunner | null): EarningEngine;
    waitForDeployment(): Promise<this>;

    interface: EarningEngineInterface;

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

    PRECISION_FACTOR: TypedContractMethod<
      [],
      [bigint],
      'view'
    >

    accruedRewards: TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [bigint],
      'view'
    >

    activationController: TypedContractMethod<
      [],
      [string],
      'view'
    >

    deductClaimableReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'nonpayable'
    >

    fundReward: TypedContractMethod<
      [asset: AddressLike, amount: BigNumberish, duration: BigNumberish, ],
      [void],
      'nonpayable'
    >

    getAccruedReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
    >

    getPendingReward: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
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

    isFunder: TypedContractMethod<
      [arg0: AddressLike, ],
      [boolean],
      'view'
    >

    isUserIndexInitialized: TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [boolean],
      'view'
    >

    lastTimeRewardApplicable: TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >

    onNftActivation: TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    onNftTransfer: TypedContractMethod<
      [from: AddressLike, to: AddressLike, tokenId: BigNumberish, ],
      [void],
      'nonpayable'
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

    registerRewardAsset: TypedContractMethod<
      [asset: AddressLike, ],
      [void],
      'nonpayable'
    >

    registeredRewardAssets: TypedContractMethod<
      [arg0: BigNumberish, ],
      [string],
      'view'
    >

    renounceOwnership: TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >

    rewardAssets: TypedContractMethod<
      [arg0: AddressLike, ],
      [[boolean, bigint, bigint, bigint, bigint, bigint, bigint] & {isRegistered: boolean, decimals: bigint, rewardRate: bigint, lastUpdateTime: bigint, globalRewardIndex: bigint, periodFinish: bigint, totalFunded: bigint }],
      'view'
    >

    rewardPerToken: TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >

    rewardPerTokenAtTimestamp: TypedContractMethod<
      [asset: AddressLike, timestamp: BigNumberish, ],
      [bigint],
      'view'
    >

    rewardVault: TypedContractMethod<
      [],
      [string],
      'view'
    >

    setFunder: TypedContractMethod<
      [funder: AddressLike, status: boolean, ],
      [void],
      'nonpayable'
    >

    setRewardVault: TypedContractMethod<
      [_rewardVault: AddressLike, ],
      [void],
      'nonpayable'
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

    updateReward: TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    updateRewardForAsset: TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [void],
      'nonpayable'
    >

    userRewardIndex: TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [bigint],
      'view'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'PRECISION_FACTOR'): TypedContractMethod<
      [],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'accruedRewards'): TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'activationController'): TypedContractMethod<
      [],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'deductClaimableReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'fundReward'): TypedContractMethod<
      [asset: AddressLike, amount: BigNumberish, duration: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'getAccruedReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'getPendingReward'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [bigint],
      'view'
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
getFunction(nameOrSignature: 'isFunder'): TypedContractMethod<
      [arg0: AddressLike, ],
      [boolean],
      'view'
    >;
getFunction(nameOrSignature: 'isUserIndexInitialized'): TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [boolean],
      'view'
    >;
getFunction(nameOrSignature: 'lastTimeRewardApplicable'): TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'onNftActivation'): TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'onNftTransfer'): TypedContractMethod<
      [from: AddressLike, to: AddressLike, tokenId: BigNumberish, ],
      [void],
      'nonpayable'
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
getFunction(nameOrSignature: 'registerRewardAsset'): TypedContractMethod<
      [asset: AddressLike, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'registeredRewardAssets'): TypedContractMethod<
      [arg0: BigNumberish, ],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'renounceOwnership'): TypedContractMethod<
      [],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'rewardAssets'): TypedContractMethod<
      [arg0: AddressLike, ],
      [[boolean, bigint, bigint, bigint, bigint, bigint, bigint] & {isRegistered: boolean, decimals: bigint, rewardRate: bigint, lastUpdateTime: bigint, globalRewardIndex: bigint, periodFinish: bigint, totalFunded: bigint }],
      'view'
    >;
getFunction(nameOrSignature: 'rewardPerToken'): TypedContractMethod<
      [asset: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'rewardPerTokenAtTimestamp'): TypedContractMethod<
      [asset: AddressLike, timestamp: BigNumberish, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'rewardVault'): TypedContractMethod<
      [],
      [string],
      'view'
    >;
getFunction(nameOrSignature: 'setFunder'): TypedContractMethod<
      [funder: AddressLike, status: boolean, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'setRewardVault'): TypedContractMethod<
      [_rewardVault: AddressLike, ],
      [void],
      'nonpayable'
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
getFunction(nameOrSignature: 'updateReward'): TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'updateRewardForAsset'): TypedContractMethod<
      [tokenId: BigNumberish, asset: AddressLike, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'userRewardIndex'): TypedContractMethod<
      [arg0: BigNumberish, arg1: AddressLike, ],
      [bigint],
      'view'
    >;

    getEvent(key: 'FunderStatusUpdated'): TypedContractEvent<FunderStatusUpdatedEvent.InputTuple, FunderStatusUpdatedEvent.OutputTuple, FunderStatusUpdatedEvent.OutputObject>;
getEvent(key: 'NFTTransferSettled'): TypedContractEvent<NFTTransferSettledEvent.InputTuple, NFTTransferSettledEvent.OutputTuple, NFTTransferSettledEvent.OutputObject>;
getEvent(key: 'OwnershipTransferred'): TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;
getEvent(key: 'Paused'): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
getEvent(key: 'RewardAssetRegistered'): TypedContractEvent<RewardAssetRegisteredEvent.InputTuple, RewardAssetRegisteredEvent.OutputTuple, RewardAssetRegisteredEvent.OutputObject>;
getEvent(key: 'RewardFunded'): TypedContractEvent<RewardFundedEvent.InputTuple, RewardFundedEvent.OutputTuple, RewardFundedEvent.OutputObject>;
getEvent(key: 'RewardUpdated'): TypedContractEvent<RewardUpdatedEvent.InputTuple, RewardUpdatedEvent.OutputTuple, RewardUpdatedEvent.OutputObject>;
getEvent(key: 'RewardVaultUpdated'): TypedContractEvent<RewardVaultUpdatedEvent.InputTuple, RewardVaultUpdatedEvent.OutputTuple, RewardVaultUpdatedEvent.OutputObject>;
getEvent(key: 'Unpaused'): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;

    filters: {

      'FunderStatusUpdated(address,bool)': TypedContractEvent<FunderStatusUpdatedEvent.InputTuple, FunderStatusUpdatedEvent.OutputTuple, FunderStatusUpdatedEvent.OutputObject>;
      FunderStatusUpdated: TypedContractEvent<FunderStatusUpdatedEvent.InputTuple, FunderStatusUpdatedEvent.OutputTuple, FunderStatusUpdatedEvent.OutputObject>;

      'NFTTransferSettled(uint256,address,address)': TypedContractEvent<NFTTransferSettledEvent.InputTuple, NFTTransferSettledEvent.OutputTuple, NFTTransferSettledEvent.OutputObject>;
      NFTTransferSettled: TypedContractEvent<NFTTransferSettledEvent.InputTuple, NFTTransferSettledEvent.OutputTuple, NFTTransferSettledEvent.OutputObject>;

      'OwnershipTransferred(address,address)': TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;
      OwnershipTransferred: TypedContractEvent<OwnershipTransferredEvent.InputTuple, OwnershipTransferredEvent.OutputTuple, OwnershipTransferredEvent.OutputObject>;

      'Paused(address)': TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
      Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;

      'RewardAssetRegistered(address,uint8)': TypedContractEvent<RewardAssetRegisteredEvent.InputTuple, RewardAssetRegisteredEvent.OutputTuple, RewardAssetRegisteredEvent.OutputObject>;
      RewardAssetRegistered: TypedContractEvent<RewardAssetRegisteredEvent.InputTuple, RewardAssetRegisteredEvent.OutputTuple, RewardAssetRegisteredEvent.OutputObject>;

      'RewardFunded(address,address,uint256,uint256,uint256,uint256)': TypedContractEvent<RewardFundedEvent.InputTuple, RewardFundedEvent.OutputTuple, RewardFundedEvent.OutputObject>;
      RewardFunded: TypedContractEvent<RewardFundedEvent.InputTuple, RewardFundedEvent.OutputTuple, RewardFundedEvent.OutputObject>;

      'RewardUpdated(uint256,address,uint256,uint256)': TypedContractEvent<RewardUpdatedEvent.InputTuple, RewardUpdatedEvent.OutputTuple, RewardUpdatedEvent.OutputObject>;
      RewardUpdated: TypedContractEvent<RewardUpdatedEvent.InputTuple, RewardUpdatedEvent.OutputTuple, RewardUpdatedEvent.OutputObject>;

      'RewardVaultUpdated(address,address)': TypedContractEvent<RewardVaultUpdatedEvent.InputTuple, RewardVaultUpdatedEvent.OutputTuple, RewardVaultUpdatedEvent.OutputObject>;
      RewardVaultUpdated: TypedContractEvent<RewardVaultUpdatedEvent.InputTuple, RewardVaultUpdatedEvent.OutputTuple, RewardVaultUpdatedEvent.OutputObject>;

      'Unpaused(address)': TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
      Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;

    };
  }
