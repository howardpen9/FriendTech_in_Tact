import { beginCell, contractAddress, toNano, Cell, Address, TonClient4, WalletContractV4 } from "ton";
import { mnemonicToPrivateKey } from "ton-crypto";

import { deploy } from "./utils/deploy";
import { printAddress, printDeploy, printHeader, printSeparator } from "./utils/print";
// ================================================================= //
import { Main } from "./output/sample_Main";
import { Role, storeBuyShares } from "./output/sample_Role";
import { Balance } from "./output/sample_Balance";

// ================================================================= //
let admin = Address.parse(""); // 🔴 Change to your own, by creating .env file!

(async () => {
    const client = new TonClient4({
        // endpoint: "https://mainnet-v4.tonhubapi.com", // 🔴 Main-net API endpoint
        endpoint: "https://sandbox-v4.tonhubapi.com", // 🔴 Test-net API endpoint
    });

    let mnemonics = (process.env.mnemonics || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0;
    let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    let wallet_contract = client.open(wallet);

    let contract_address = await Main.fromInit(admin);
    let client_open = client.open(contract_address);

    const index = 0n;
    let roleAddress_by_index = await client_open.getGetRoleAddress(index);
    printHeader("Printing Role Address by Index");
    console.log("Index ID[" + index + "]: " + roleAddress_by_index);

    // let role = client.open(await Role.fromAddress(roleAddress_by_index));
    let role = client.open(await Role.fromInit(contract_address.address, 0n, admin));
    console.log("Role Address(2):" + role.address.toString());
})();
