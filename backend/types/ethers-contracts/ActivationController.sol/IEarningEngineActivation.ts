import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedListener, TypedContractMethod } from "../common.js"

  export interface IEarningEngineActivationInterface extends Interface {
    getFunction(nameOrSignature: "onNftActivation"): FunctionFragment;

    encodeFunctionData(functionFragment: 'onNftActivation', values: [BigNumberish]): string;

    decodeFunctionResult(functionFragment: 'onNftActivation', data: BytesLike): Result;
  }

  export interface IEarningEngineActivation extends BaseContract {

    connect(runner?: ContractRunner | null): IEarningEngineActivation;
    waitForDeployment(): Promise<this>;

    interface: IEarningEngineActivationInterface;

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

    onNftActivation: TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'onNftActivation'): TypedContractMethod<
      [tokenId: BigNumberish, ],
      [void],
      'nonpayable'
    >;

    filters: {

    };
  }
