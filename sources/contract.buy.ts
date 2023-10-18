import { Address, beginCell, contractAddress, toNano, TonClient4, internal, fromNano, WalletContractV4 } from "ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import * as dotenv from "dotenv";
dotenv.config();

import { Main } from "./output/sample_Main";
import { Role, storeBuyShares } from "./output/sample_Role";

let admin = Address.parse(""); // 🔴 Change to your own, by creating .env file!

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client4 = new TonClient4({
        endpoint: "https://sandbox-v4.tonhubapi.com",
    });

    let mnemonics = (process.env.mnemonics || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0;
    let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    let wallet_contract = client4.open(wallet);

    // Preparing the Factory contract parameters
    let init = await Main.fromInit(admin);
    let contract = client4.open(init);

    let target_userProfile_index = 0n;
    let get_userProfile_address = await contract.getGetRoleAddress(target_userProfile_index);

    let packed = beginCell()
        .store(
            storeBuyShares({
                $$type: "BuyShares",
                query_id: 0n,
                amount: 10n,
            })
        )
        .endCell();

    let deployAmount = toNano("2");
    let seqno: number = await wallet_contract.getSeqno();
    let balance: bigint = await wallet_contract.getBalance();

    console.log("Current deployment wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Wallet:", wallet.address.toString());
    console.log("===========================================");
    console.log("Calling to Role[" + target_userProfile_index + "]" + get_userProfile_address.toString());

    await wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: get_userProfile_address,
                value: deployAmount,
                bounce: true,
                body: packed,
            }),
        ],
    });
})();
