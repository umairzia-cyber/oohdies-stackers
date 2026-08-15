import { ethers } from 'ethers'
import { DeployContractOptions, FactoryOptions, HardhatEthersHelpers as HardhatEthersHelpersBase} from "@nomicfoundation/hardhat-ethers/types";

import * as Contracts from "./index.js";

declare module "@nomicfoundation/hardhat-ethers/types" {
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase {
  getContractFactory(name: 'BananaToken', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.BananaToken__factory>
getContractFactory(name: 'ActivationController', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.ActivationController__factory>
getContractFactory(name: 'IBurnableERC20', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IBurnableERC20__factory>
getContractFactory(name: 'IEarningEngineActivation', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IEarningEngineActivation__factory>
getContractFactory(name: 'EarningEngine', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.EarningEngine__factory>
getContractFactory(name: 'IActivationControllerView', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IActivationControllerView__factory>
getContractFactory(name: 'IActivationControllerHook', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IActivationControllerHook__factory>
getContractFactory(name: 'IEarningEngineHook', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IEarningEngineHook__factory>
getContractFactory(name: 'OohdiesNFT', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.OohdiesNFT__factory>
getContractFactory(name: 'IEarningEngineVault', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.IEarningEngineVault__factory>
getContractFactory(name: 'RewardVault', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.RewardVault__factory>
getContractFactory(name: 'MockRewardToken', signerOrOptions?: ethers.Signer | FactoryOptions): Promise<Contracts.MockRewardToken__factory>

  getContractAt(name: 'BananaToken', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.BananaToken>
getContractAt(name: 'ActivationController', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.ActivationController>
getContractAt(name: 'IBurnableERC20', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IBurnableERC20>
getContractAt(name: 'IEarningEngineActivation', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IEarningEngineActivation>
getContractAt(name: 'EarningEngine', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.EarningEngine>
getContractAt(name: 'IActivationControllerView', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IActivationControllerView>
getContractAt(name: 'IActivationControllerHook', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IActivationControllerHook>
getContractAt(name: 'IEarningEngineHook', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IEarningEngineHook>
getContractAt(name: 'OohdiesNFT', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.OohdiesNFT>
getContractAt(name: 'IEarningEngineVault', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.IEarningEngineVault>
getContractAt(name: 'RewardVault', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.RewardVault>
getContractAt(name: 'MockRewardToken', address: string | ethers.Addressable, signer?: ethers.Signer): Promise<Contracts.MockRewardToken>

  deployContract(name: 'BananaToken', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.BananaToken>
deployContract(name: 'ActivationController', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.ActivationController>
deployContract(name: 'IBurnableERC20', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IBurnableERC20>
deployContract(name: 'IEarningEngineActivation', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineActivation>
deployContract(name: 'EarningEngine', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.EarningEngine>
deployContract(name: 'IActivationControllerView', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IActivationControllerView>
deployContract(name: 'IActivationControllerHook', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IActivationControllerHook>
deployContract(name: 'IEarningEngineHook', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineHook>
deployContract(name: 'OohdiesNFT', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.OohdiesNFT>
deployContract(name: 'IEarningEngineVault', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineVault>
deployContract(name: 'RewardVault', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.RewardVault>
deployContract(name: 'MockRewardToken', signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.MockRewardToken>

  deployContract(name: 'BananaToken', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.BananaToken>
deployContract(name: 'ActivationController', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.ActivationController>
deployContract(name: 'IBurnableERC20', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IBurnableERC20>
deployContract(name: 'IEarningEngineActivation', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineActivation>
deployContract(name: 'EarningEngine', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.EarningEngine>
deployContract(name: 'IActivationControllerView', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IActivationControllerView>
deployContract(name: 'IActivationControllerHook', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IActivationControllerHook>
deployContract(name: 'IEarningEngineHook', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineHook>
deployContract(name: 'OohdiesNFT', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.OohdiesNFT>
deployContract(name: 'IEarningEngineVault', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.IEarningEngineVault>
deployContract(name: 'RewardVault', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.RewardVault>
deployContract(name: 'MockRewardToken', args: any[], signerOrOptions?: ethers.Signer | DeployContractOptions): Promise<Contracts.MockRewardToken>

    getContractFactory(
      name: string,
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<ethers.ContractFactory>;
    getContractFactory(
      abi: any[],
      bytecode: ethers.BytesLike,
      signer?: ethers.Signer
    ): Promise<ethers.ContractFactory>;
    getContractAt(
      nameOrAbi: string | any[],
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<ethers.Contract>;
    deployContract(
      name: string,
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<ethers.Contract>;
    deployContract(
      name: string,
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<ethers.Contract>;
  }
}
