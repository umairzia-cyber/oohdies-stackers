import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();
  const provider = ethers.provider;
  const net = await provider.getNetwork();

  console.log("==================================================");
  console.log("ROBINHOOD CHAIN TESTNET REWARD FUNDING SCRIPT");
  console.log("==================================================");
  console.log("Chain ID: ", net.chainId.toString());

  if (net.chainId !== 46630n) {
    throw new Error(`Invalid Chain ID: expected 46630, got ${net.chainId}`);
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer signer available! Set PRIVATE_KEY environment variable.");
  }

  const funder = signers[0];
  console.log("Funder / Deployer Address:", funder.address);

  const ethBal = await provider.getBalance(funder.address);
  console.log("ETH Balance:             ", ethers.formatEther(ethBal), "ETH");

  const ENGINE_ADDR = "0xB17eD4e01FbBA8F123412156a3545dB53585c179";
  const VAULT_ADDR  = "0xC7DD1b6110dBdDf15636240f85341de2b8B21EfD";
  const USDG_ADDR   = "0xF25905f4ba33706ab2C064da2e786bc33d21cf0f";
  const AAPL_ADDR   = "0xd38EAB6b104950b0443d3c6FB432e89631BDbC88";

  const engine = await ethers.getContractAt("EarningEngine", ENGINE_ADDR, funder);
  const vault  = await ethers.getContractAt("RewardVault", VAULT_ADDR, funder);
  const usdg   = await ethers.getContractAt("MockRewardToken", USDG_ADDR, funder);
  const aapl   = await ethers.getContractAt("MockRewardToken", AAPL_ADDR, funder);

  const usdgAmount = 10_000n * 10n ** 6n;
  const aaplAmount = 1_000n * 10n ** 18n;
  const duration   = 3600n;

  console.log("\n--- STEP 1: MINTING MOCK REWARD TOKENS ---");

  const mintUsdgTx = await usdg.mint(funder.address, usdgAmount * 2n);
  const mintUsdgRc = await mintUsdgTx.wait();
  console.log(`1. USDG Mint Tx:   ${mintUsdgRc.hash}`);

  const mintAaplTx = await aapl.mint(funder.address, aaplAmount * 2n);
  const mintAaplRc = await mintAaplTx.wait();
  console.log(`2. AAPLx Mint Tx:  ${mintAaplRc.hash}`);

  console.log("\n--- STEP 2: FUNDING EARNING ENGINE ---");

  const appEngineUsdgTx = await usdg.approve(ENGINE_ADDR, usdgAmount);
  await appEngineUsdgTx.wait();

  const fundUsdgTx = await engine.fundReward(USDG_ADDR, usdgAmount, duration);
  const fundUsdgRc = await fundUsdgTx.wait();
  console.log(`3. USDG Engine Funding Tx: ${fundUsdgRc.hash}`);

  const appEngineAaplTx = await aapl.approve(ENGINE_ADDR, aaplAmount);
  await appEngineAaplTx.wait();

  const fundAaplTx = await engine.fundReward(AAPL_ADDR, aaplAmount, duration);
  const fundAaplRc = await fundAaplTx.wait();
  console.log(`4. AAPLx Engine Funding Tx: ${fundAaplRc.hash}`);

  console.log("\n--- STEP 3: DEPOSITING PHYSICAL BACKING INTO REWARD VAULT ---");

  const appVaultUsdgTx = await usdg.approve(VAULT_ADDR, usdgAmount);
  await appVaultUsdgTx.wait();

  const depUsdgTx = await vault.depositReward(USDG_ADDR, usdgAmount);
  const depUsdgRc = await depUsdgTx.wait();
  console.log(`5. USDG Vault Deposit Tx: ${depUsdgRc.hash}`);

  const appVaultAaplTx = await aapl.approve(VAULT_ADDR, aaplAmount);
  await appVaultAaplTx.wait();

  const depAaplTx = await vault.depositReward(AAPL_ADDR, aaplAmount);
  const depAaplRc = await depAaplTx.wait();
  console.log(`6. AAPLx Vault Deposit Tx: ${depAaplRc.hash}`);

  console.log("\n==================================================");
  console.log("REWARD FUNDING COMPLETE (1-HOUR TEST PERIOD)");
  console.log("==================================================");

  const usdgInfo = await engine.rewardAssets(USDG_ADDR);
  const aaplInfo = await engine.rewardAssets(AAPL_ADDR);
  const vaultUsdgBal = await vault.getVaultBalance(USDG_ADDR);
  const vaultAaplBal = await vault.getVaultBalance(AAPL_ADDR);

  console.log("USDG Rate:        ", usdgInfo.rewardRate.toString(), "wei/sec");
  console.log("USDG periodFinish:", usdgInfo.periodFinish.toString(), `(${new Date(Number(usdgInfo.periodFinish)*1000).toISOString()})`);
  console.log("AAPLx Rate:       ", aaplInfo.rewardRate.toString(), "wei/sec");
  console.log("AAPLx periodFinish:", aaplInfo.periodFinish.toString(), `(${new Date(Number(aaplInfo.periodFinish)*1000).toISOString()})`);
  console.log("Vault USDG Bal:   ", ethers.formatUnits(vaultUsdgBal, 6), "USDG");
  console.log("Vault AAPLx Bal:  ", ethers.formatEther(vaultAaplBal), "AAPLx");
}

main().catch((err) => {
  console.error("Funding error:", err);
  process.exitCode = 1;
});
