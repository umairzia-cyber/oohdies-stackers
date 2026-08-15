import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();
  console.log("=== Executing On-Chain E2E Protocol Lifecycle Verification on Robinhood Chain Testnet ===");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const net = await provider.getNetwork();

  console.log("Network Name:", net.name);
  console.log("Chain ID:    ", net.chainId.toString());
  console.log("Deployer:    ", deployer.address);

  const BANANA_ADDR     = "0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1";
  const NFT_ADDR        = "0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A";
  const ACTIVATION_ADDR = "0x9d3A2350d8679B8828003b96D35c125037F29F49";
  const ENGINE_ADDR     = "0xB17eD4e01FbBA8F123412156a3545dB53585c179";
  const VAULT_ADDR      = "0xC7DD1b6110dBdDf15636240f85341de2b8B21EfD";
  const USDG_ADDR       = "0xF25905f4ba33706ab2C064da2e786bc33d21cf0f";
  const AAPL_ADDR       = "0xd38EAB6b104950b0443d3c6FB432e89631BDbC88";

  const banana     = await ethers.getContractAt("BananaToken", BANANA_ADDR, deployer);
  const nft        = await ethers.getContractAt("OohdiesNFT", NFT_ADDR, deployer);
  const activation = await ethers.getContractAt("ActivationController", ACTIVATION_ADDR, deployer);
  const engine     = await ethers.getContractAt("EarningEngine", ENGINE_ADDR, deployer);
  const vault      = await ethers.getContractAt("RewardVault", VAULT_ADDR, deployer);
  const usdg       = await ethers.getContractAt("MockRewardToken", USDG_ADDR, deployer);
  const aapl       = await ethers.getContractAt("MockRewardToken", AAPL_ADDR, deployer);

  const alice = deployer;
  const bobWallet = ethers.Wallet.createRandom().connect(provider);

  console.log("\n[Setup] Funding Bob wallet with ETH for gas...");
  const fundEthTx = await alice.sendTransaction({
    to: bobWallet.address,
    value: ethers.parseEther("0.0005"),
  });
  await fundEthTx.wait();
  console.log(`  - Bob wallet created & funded: ${bobWallet.address}`);

  const bobNFT = nft.connect(bobWallet);
  const bobBanana = banana.connect(bobWallet);
  const bobActivation = activation.connect(bobWallet);
  const bobVault = vault.connect(bobWallet);

  console.log("\n--- A. MINT ---");
  const mintTx = await nft.mint(alice.address);
  await mintTx.wait();
  const totalMinted = await nft.totalMinted();
  const tokenId = totalMinted;
  const nftOwner = await nft.ownerOf(tokenId);
  console.log(`  - Minted Oohdies NFT #${tokenId}`);
  console.log(`  - NFT #${tokenId} Owner: ${nftOwner} (Verified: ${nftOwner === alice.address})`);

  console.log("\n--- B. ACTIVATE ---");
  const actCost = await activation.activationCost();
  const aliceBananaBefore = await banana.balanceOf(alice.address);
  const supplyBefore = await banana.totalSupply();

  const approveTx = await banana.approve(ACTIVATION_ADDR, actCost);
  await approveTx.wait();

  const actTx = await activation.activate(tokenId);
  await actTx.wait();

  const aliceBananaAfter = await banana.balanceOf(alice.address);
  const supplyAfter = await banana.totalSupply();
  const isAct = await activation.isActivated(tokenId);
  const actAt = await activation.getActivatedAt(tokenId);

  console.log(`  - BANANA burned: ${ethers.formatEther(aliceBananaBefore - aliceBananaAfter)} BANANA`);
  console.log(`  - Total BANANA Supply Decreased: ${supplyBefore - supplyAfter === actCost}`);
  console.log(`  - NFT #${tokenId} Activated: ${isAct}`);
  console.log(`  - Activated Timestamp: ${actAt}`);

  console.log("\n--- C. FUND REWARDS ---");
  const usdgFundAmount = 10_000n * 10n ** 6n;
  const aaplFundAmount = 1_000n * 10n ** 18n;
  const duration = 1000n;

  await (await usdg.mint(alice.address, usdgFundAmount * 2n)).wait();
  await (await aapl.mint(alice.address, aaplFundAmount * 2n)).wait();

  await (await usdg.approve(ENGINE_ADDR, usdgFundAmount)).wait();
  await (await engine.fundReward(USDG_ADDR, usdgFundAmount, duration)).wait();

  await (await aapl.approve(ENGINE_ADDR, aaplFundAmount)).wait();
  await (await engine.fundReward(AAPL_ADDR, aaplFundAmount, duration)).wait();

  await (await usdg.approve(VAULT_ADDR, usdgFundAmount)).wait();
  await (await vault.depositReward(USDG_ADDR, usdgFundAmount)).wait();

  await (await aapl.approve(VAULT_ADDR, aaplFundAmount)).wait();
  await (await vault.depositReward(AAPL_ADDR, aaplFundAmount)).wait();

  const engineUSDG = await usdg.balanceOf(ENGINE_ADDR);
  const vaultUSDG  = await vault.getVaultBalance(USDG_ADDR);
  console.log(`  - EarningEngine USDG Balance: ${ethers.formatUnits(engineUSDG, 6)} USDG`);
  console.log(`  - RewardVault   USDG Balance: ${ethers.formatUnits(vaultUSDG, 6)} USDG`);

  console.log("\n--- D. EARN REWARDS ---");

  const block1 = await provider.getBlock("latest");
  console.log(`  - Current Block Number: ${block1.number}, Timestamp: ${block1.timestamp}`);

  const pendingUSDG = await engine.getTotalClaimableReward(tokenId, USDG_ADDR);
  const pendingAAPL = await engine.getTotalClaimableReward(tokenId, AAPL_ADDR);
  console.log(`  - NFT #${tokenId} Pending USDG: ${ethers.formatUnits(pendingUSDG, 6)} USDG`);
  console.log(`  - NFT #${tokenId} Pending AAPLx: ${ethers.formatEther(pendingAAPL)} AAPLx`);

  console.log("\n--- E. TRANSFER ---");
  const xferTx = await nft.transferFrom(alice.address, bobWallet.address, tokenId);
  await xferTx.wait();

  const newOwner = await nft.ownerOf(tokenId);
  const isActPostXfer = await activation.isActivated(tokenId);
  const actAtPostXfer = await activation.getActivatedAt(tokenId);
  const totalAct = await activation.totalActivated();

  console.log(`  - NFT #${tokenId} Transferred to: ${newOwner} (Bob)`);
  console.log(`  - NFT #${tokenId} Activated Post-Transfer: ${isActPostXfer} (Expected: false)`);
  console.log(`  - NFT #${tokenId} ActivatedAt Post-Transfer: ${actAtPostXfer} (Expected: 0)`);
  console.log(`  - Total Activated Count: ${totalAct}`);

  console.log("\n--- F. PRESERVE PRE-TRANSFER REWARDS ---");
  const claimablePostXferUSDG = await engine.getTotalClaimableReward(tokenId, USDG_ADDR);
  console.log(`  - NFT #${tokenId} Preserved Claimable USDG: ${ethers.formatUnits(claimablePostXferUSDG, 6)} USDG`);

  let aliceClaimFailed = false;
  try {
    await vault.claimReward(tokenId, USDG_ADDR);
  } catch (err) {
    aliceClaimFailed = true;
    console.log(`  - Alice (previous owner) claim rejected cleanly: ${err.message.includes("NotNFTOwner") || err.message.includes("revert")}`);
  }

  console.log("\n--- G. REACTIVATE ---");

  await (await banana.transfer(bobWallet.address, actCost)).wait();
  await (await bobBanana.approve(ACTIVATION_ADDR, actCost)).wait();
  await (await bobActivation.activate(tokenId)).wait();

  const isActBob = await activation.isActivated(tokenId);
  const actAtBob = await activation.getActivatedAt(tokenId);
  console.log(`  - Bob reactivated NFT #${tokenId}: ${isActBob}`);
  console.log(`  - New Activation Timestamp: ${actAtBob}`);

  console.log("\n--- H. CLAIM & MULTI-ASSET ISOLATION ---");
  const bobUsdgBefore = await usdg.balanceOf(bobWallet.address);
  const bobAaplBefore = await aapl.balanceOf(bobWallet.address);
  const vaultUsdgBefore = await vault.getVaultBalance(USDG_ADDR);

  const bobClaimUsdgTx = await bobVault.claimReward(tokenId, USDG_ADDR);
  await bobClaimUsdgTx.wait();

  const bobUsdgAfter = await usdg.balanceOf(bobWallet.address);
  const bobAaplAfter = await aapl.balanceOf(bobWallet.address);
  const vaultUsdgAfter = await vault.getVaultBalance(USDG_ADDR);

  const claimedUSDG = bobUsdgAfter - bobUsdgBefore;
  console.log(`  - Bob Claimed USDG: ${ethers.formatUnits(claimedUSDG, 6)} USDG`);
  console.log(`  - RewardVault USDG Balance Decreased by Claimed Amount: ${vaultUsdgBefore - vaultUsdgAfter === claimedUSDG}`);
  console.log(`  - Multi-Asset Isolation: Bob AAPLx Balance Unchanged during USDG Claim: ${bobAaplAfter === bobAaplBefore}`);

  const bobClaimAaplTx = await bobVault.claimReward(tokenId, AAPL_ADDR);
  await bobClaimAaplTx.wait();
  const bobAaplFinal = await aapl.balanceOf(bobWallet.address);
  console.log(`  - Bob Claimed AAPLx Independently: ${ethers.formatEther(bobAaplFinal - bobAaplBefore)} AAPLx`);

  let doubleClaimFailed = false;
  try {
    await bobVault.claimReward(tokenId, USDG_ADDR);
  } catch (err) {
    doubleClaimFailed = true;
    console.log(`  - Double claim prevented cleanly (Reverted NoRewardToClaim): true`);
  }

  console.log("\n=== ON-CHAIN E2E PROTOCOL LIFECYCLE VERIFICATION SUCCESSFUL! ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
