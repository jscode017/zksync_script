import * as zksync from "zksync";
import { Wallet } from "zksync";
import * as ethers from "ethers";

const syncProvider = await zksync.Provider.newHttpProvider("http://localhost:3030/jsrpc");
console.log(syncProvider)
const ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const blockNum=await ethersProvider.getBlockNumber()
console.log(blockNum)
console.log(ethersProvider)

let privKey="0xcfb3347dfbf70ca6615ceac0f7791cd822ccf96c5cec552367a8380edc4e94f6"
const ethWallet = new ethers.Wallet(privKey,ethersProvider);
console.log(ethWallet.address)
const syncWallet = await zksync.Wallet.fromEthSigner(ethWallet, syncProvider);
console.log(syncWallet)
var deposit;
deposit = await syncWallet.depositToSyncFromEthereum({
  depositTo: syncWallet.address(),
  token: "ETH",
  amount: ethers.utils.parseEther("1.0"),
});
const depositReceipt = await deposit.awaitReceipt();
console.log(depositReceipt)
const verifiedDepositReceipt = await deposit.awaitVerifyReceipt();
console.log(verifiedDepositReceipt)
const committedETHBalance = await syncWallet.getBalance("ETH");
console.log(committedETHBalance)
