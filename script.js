import * as zksync from "zksync";
import { Wallet, wallet } from "zksync";
import * as ethers from "ethers";
import { Command } from 'commander';
const program = new Command();
program
  .option('-s,--setup', 'setup 2 accounts')
  .option('-t,--transactions', 'send lots of transactions')
  .option('-b,--batch', 'send a batch transaction')
program.parse(process.argv);
const options = program.opts()
console.log(program.mode)
if (options.setup) {
  console.log('set up')
} else if (options.transactions) {
  console.log("send transactions")
}

const syncProvider = await zksync.Provider.newHttpProvider("http://localhost:3030");
console.log(syncProvider)
const ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const blockNum = await ethersProvider.getBlockNumber()
console.log(blockNum)
console.log(ethersProvider)

let privKey = "0xcfb3347dfbf70ca6615ceac0f7791cd822ccf96c5cec552367a8380edc4e94f6"
let privKey2 = "0xc48b5baa240c82073aa201be684549366f10ee907de7dea870d11faf4674769a"
const ethWallet = new ethers.Wallet(privKey, ethersProvider);
const ethWallet2 = new ethers.Wallet(privKey2, ethersProvider);

const syncWallet = await zksync.Wallet.fromEthSigner(ethWallet, syncProvider);
const syncWallet2 = await zksync.Wallet.fromEthSigner(ethWallet2, syncProvider);
if (options.setup) {
  const deposit = await syncWallet.depositToSyncFromEthereum({
    depositTo: syncWallet.address(),
    token: "ETH",
    amount: ethers.utils.parseEther("100.0"),
  });
  const deposit2 = await syncWallet2.depositToSyncFromEthereum({
    depositTo: syncWallet2.address(),
    token: "ETH",
    amount: ethers.utils.parseEther("100.0"),
  });
  console.log(deposit)
  const committedETHBalance = await syncWallet.getBalance("ETH");
  console.log(committedETHBalance)
  const depositReceipt = await deposit2.awaitReceipt();
  console.log(depositReceipt)
  const verifiedDepositReceipt = await deposit2.awaitVerifyReceipt();
  console.log(verifiedDepositReceipt)
} else if (options.transactions) {
  if (!(await syncWallet.isSigningKeySet())) {
    if ((await syncWallet.getAccountId()) == undefined) {
      throw new Error("Unknown account");
    }

    const changePubkey = await syncWallet.setSigningKey({
      feeToken: "ETH",
      ethAuthType: "ECDSA",
    });

    // Wait until the tx is committed
    await changePubkey.awaitReceipt();
  }
  const amount = zksync.utils.closestPackableTransactionAmount(ethers.utils.parseEther("0.999"));
  var transfer;
  for (let i = 0; i < 30; i++) {
    transfer = await syncWallet.syncTransfer({
      to: syncWallet2.address(),
      token: "ETH",
      amount: ethers.utils.parseEther("0.001"),
    });
  }
  const transferReceipt = await transfer.awaitReceipt();
  console.log(transferReceipt)
} else if (options.batch) {
  console.log("Starting batch process")
  if (!(await syncWallet.isSigningKeySet())) {
    console.log("Signing key not set!");
    if ((await syncWallet.getAccountId()) == undefined) {
      throw new Error("Unknown account");
    }

    const changePubkey = await syncWallet.setSigningKey({
      feeToken: "ETH",
      ethAuthType: "ECDSA",
    });

    // Wait until the tx is committed
    await changePubkey.awaitReceipt();
  }
  const token = "ETH"
  const amount = zksync.utils.closestPackableTransactionAmount(ethers.utils.parseEther("0.999"));

  console.log("Starting batch builder");
  const batchBuilder = syncWallet.batchBuilder()
  for(var i = 0; i<16; i++) {
    batchBuilder.addTransfer({ to: syncWallet2.address(), token, amount })
  }
  const batch = await batchBuilder.build(token)

  console.log("Batch: ", batch)
  
  const totalFee = batch.totalFee.get(token)
  console.log("Total fee: ", totalFee)

  const senderBefore = await syncWallet.getBalance(token);
  const receiverBefore = await syncWallet2.getBalance(token);
  console.log("Submitting signed batch transactions")
  console.log("Wallet: ", wallet)

  const handles = await wallet.submitSignedTransactionsBatch(syncWallet.provider, batch.txs, [batch.signature]);
  await Promise.all(handles.map((handle) => handle.awaitReceipt()));
  const senderAfter = await syncWallet.getBalance(token);
  const receiverAfter = await syncWallet2.getBalance(token);

  console.log("Sender before: ", senderBefore)
  console.log("Sender after: ", senderAfter)
  const senderDiff = senderBefore.sub(senderAfter)
  console.log("Sender diff: ", senderDiff)
  console.log(senderDiff.toString())

  console.log("Receiver before: ", receiverBefore)
  console.log("Receiver after: ", receiverAfter)
  const receiverDiff = receiverAfter.sub(receiverBefore)
  console.log(receiverDiff.toString())
  
  console.log("Should be 0: ", senderDiff.sub(receiverDiff).sub(totalFee).toString())
}
