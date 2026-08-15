import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedListener, TypedContractMethod } from "../common.js"

  export interface IEarningEngineHookInterface extends Interface {
    getFunction(nameOrSignature: "onNftTransfer"): FunctionFragment;

    encodeFunctionData(functionFragment: 'onNftTransfer', values: [AddressLike, AddressLike, BigNumberish]): string;

    decodeFunctionResult(functionFragment: 'onNftTransfer', data: BytesLike): Result;
  }

  export interface IEarningEngineHook extends BaseContract {

    connect(runner?: ContractRunner | null): IEarningEngineHook;
    waitForDeployment(): Promise<this>;

    interface: IEarningEngineHookInterface;

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

    onNftTransfer: TypedContractMethod<
      [from: AddressLike, to: AddressLike, tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'onNftTransfer'): TypedContractMethod<
      [from: AddressLike, to: AddressLike, tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;

    filters: {

    };
  }
