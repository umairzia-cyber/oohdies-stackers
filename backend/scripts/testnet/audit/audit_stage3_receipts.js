// SPDX-License-Identifier: MIT
/**
 * @file audit_stage3_receipts.js
 * @notice Independently audits and verifies all Stage 3 on-chain transaction receipts from Robinhood Testnet.
 * @dev Network: Robinhood Chain Testnet (Chain ID: 46630 / 0xb626).
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_NAME,
  assertTestnetNetwork,
} from "../../../lib/testnet_config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stage3TxPath = path.resolve(__dirname, "../../../testnet-results/stage3/stage3_transactions.json");
const outputDir = path.resolve(__dirname, "../../../testnet-results/stage3a");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function auditStage3Receipts() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 STAGE 3A — INDEPENDENT ON-CHAIN RECEIPT AUDIT OF STAGE 3 TRANSACTIONS");
  console.log("=".repeat(80));

  const provider = new ethers.JsonRpcProvider(
    process.env.ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com"
  );
  await assertTestnetNetwork(provider);

  if (!fs.existsSync(stage3TxPath)) {
    throw new Error(`Stage 3 transactions file not found at: ${stage3TxPath}`);
  }

  const stage3Transactions = JSON.parse(fs.readFileSync(stage3TxPath, "utf8"));
  console.log(`Auditing ${stage3Transactions.length} historical Stage 3 transactions on Robinhood Testnet...\n`);

  const auditedReceipts = [];
  let totalGasAudited = 0n;
  let allPass = true;

  for (let i = 0; i < stage3Transactions.length; i++) {
    const txMeta = stage3Transactions[i];
    console.log(`[${i + 1}/${stage3Transactions.length}] Auditing Tx: ${txMeta.name} (${txMeta.hash})...`);

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txMeta.hash),
      provider.getTransactionReceipt(txMeta.hash),
    ]);

    if (!tx) {
      console.error(`  ❌ Transaction not found on-chain: ${txMeta.hash}`);
      allPass = false;
      auditedReceipts.push({
        name: txMeta.name,
        hash: txMeta.hash,
        verified: false,
        error: "Transaction not found on Robinhood Testnet",
      });
      continue;
    }

    if (!receipt) {
      console.error(`  ❌ Transaction receipt not found on-chain: ${txMeta.hash}`);
      allPass = false;
      auditedReceipts.push({
        name: txMeta.name,
        hash: txMeta.hash,
        verified: false,
        error: "Receipt not found",
      });
      continue;
    }

    const statusMatch = receipt.status === 1;
    const blockMatch = Number(receipt.blockNumber) === Number(txMeta.blockNumber);
    const fromMatch = receipt.from.toLowerCase() === txMeta.from.toLowerCase();
    const gasUsedStr = receipt.gasUsed.toString();
    const gasMatch = gasUsedStr === txMeta.gasUsed;

    totalGasAudited += receipt.gasUsed;

    const auditRecord = {
      index: i + 1,
      name: txMeta.name,
      hash: txMeta.hash,
      blockNumber: Number(receipt.blockNumber),
      blockNumberReported: Number(txMeta.blockNumber),
      blockMatch,
      status: receipt.status === 1 ? "SUCCESS" : "REVERTED",
      statusReported: txMeta.status,
      statusMatch,
      from: receipt.from,
      fromReported: txMeta.from,
      fromMatch,
      to: receipt.to,
      toReported: txMeta.to,
      gasUsed: gasUsedStr,
      gasUsedReported: txMeta.gasUsed,
      gasMatch,
      logsCount: receipt.logs.length,
      verified: statusMatch && blockMatch && fromMatch && gasMatch,
    };

    if (!auditRecord.verified) {
      console.error(`  ⚠️ Verification mismatch in tx: ${txMeta.name}`);
      allPass = false;
    } else {
      console.log(`  ✓ Verified | Block: ${receipt.blockNumber} | Gas: ${gasUsedStr} | Status: SUCCESS | Logs: ${receipt.logs.length}`);
    }

    auditedReceipts.push(auditRecord);
  }

  const auditSummary = {
    timestamp: new Date().toISOString(),
    network: ROBINHOOD_TESTNET_CHAIN_NAME,
    chainId: ROBINHOOD_TESTNET_CHAIN_ID.toString(),
    chainIdHex: "0xb626",
    totalTransactionsAudited: auditedReceipts.length,
    totalGasUsed: totalGasAudited.toString(),
    allReceiptsValid: allPass,
    verdict: allPass ? "PASS" : "FAIL",
    transactions: auditedReceipts,
  };

  const outputPath = path.join(outputDir, "stage3a_receipt_audit.json");
  fs.writeFileSync(outputPath, JSON.stringify(auditSummary, null, 2));

  console.log("\n" + "=".repeat(80));
  console.log(`Receipt Audit Result: ${auditSummary.verdict}`);
  console.log(`Total Transactions Verified: ${auditedReceipts.filter((r) => r.verified).length} / ${auditedReceipts.length}`);
  console.log(`Audit saved to: ${outputPath}`);
  console.log("=".repeat(80));

  return auditSummary;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  auditStage3Receipts().catch((err) => {
    console.error("Receipt Audit Failed:", err);
    process.exit(1);
  });
}
