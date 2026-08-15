import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedListener, TypedContractMethod } from "../common.js"

  export interface IActivationControllerHookInterface extends Interface {
    getFunction(nameOrSignature: "deactivateOnTransfer"): FunctionFragment;

    encodeFunctionData(functionFragment: 'deactivateOnTransfer', values: [BigNumberish]): string;

    decodeFunctionResult(functionFragment: 'deactivateOnTransfer', data: BytesLike): Result;
  }

  export interface IActivationControllerHook extends BaseContract {

    connect(runner?: ContractRunner | null): IActivationControllerHook;
    waitForDeployment(): Promise<this>;

    interface: IActivationControllerHookInterface;

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

    deactivateOnTransfer: TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'deactivateOnTransfer'): TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;

    filters: {

    };
  }
