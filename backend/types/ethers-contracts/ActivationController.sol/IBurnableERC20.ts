import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers"
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedListener, TypedContractMethod } from "../common.js"

  export interface IBurnableERC20Interface extends Interface {
    getFunction(nameOrSignature: "allowance" | "balanceOf" | "burnFrom" | "totalSupply"): FunctionFragment;

    encodeFunctionData(functionFragment: 'allowance', values: [AddressLike, AddressLike]): string;
encodeFunctionData(functionFragment: 'balanceOf', values: [AddressLike]): string;
encodeFunctionData(functionFragment: 'burnFrom', values: [AddressLike, BigNumberish]): string;
encodeFunctionData(functionFragment: 'totalSupply', values?: undefined): string;

    decodeFunctionResult(functionFragment: 'allowance', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'balanceOf', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'burnFrom', data: BytesLike): Result;
decodeFunctionResult(functionFragment: 'totalSupply', data: BytesLike): Result;
  }

  export interface IBurnableERC20 extends BaseContract {

    connect(runner?: ContractRunner | null): IBurnableERC20;
    waitForDeployment(): Promise<this>;

    interface: IBurnableERC20Interface;

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

    allowance: TypedContractMethod<
      [owner: AddressLike, spender: AddressLike, ],
      [bigint],
      'view'
    >

    balanceOf: TypedContractMethod<
      [account: AddressLike, ],
      [bigint],
      'view'
    >

    burnFrom: TypedContractMethod<
      [account: AddressLike, amount: BigNumberish, ],
      [void],
      'nonpayable'
    >

    totalSupply: TypedContractMethod<
      [],
      [bigint],
      'view'
    >

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: 'allowance'): TypedContractMethod<
      [owner: AddressLike, spender: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'balanceOf'): TypedContractMethod<
      [account: AddressLike, ],
      [bigint],
      'view'
    >;
getFunction(nameOrSignature: 'burnFrom'): TypedContractMethod<
      [account: AddressLike, amount: BigNumberish, ],
      [void],
      'nonpayable'
    >;
getFunction(nameOrSignature: 'totalSupply'): TypedContractMethod<
      [],
      [bigint],
      'view'
    >;

    filters: {

    };
  }
