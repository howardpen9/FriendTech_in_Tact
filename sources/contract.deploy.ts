import { beginCell, contractAddress, toNano, Cell, Address } from "ton";
import { deploy } from "./utils/deploy";
import { printAddress, printDeploy, printHeader } from "./utils/print";
// ================================================================= //
import { Main, storeCreate } from "./output/sample_Main";
// ================================================================= //

let admin = Address.parse(""); // 🔴 Change to your own, by creating .env file!

(async () => {
    // The Transaction body we want to pass to the smart contract
    let body = beginCell()
        .store(
            storeCreate({
                $$type: "Create",
                owner: admin,
            })
        )
        .endCell();

    // ===== Parameters =====
    // Replace owner with your address

    let init = await Main.init(admin);
    let address = contractAddress(0, init);
    let deployAmount = toNano("0.1");
    let testnet = true;

    // Do deploy
    await deploy(init, deployAmount, body, testnet);
    printHeader("sampleNFT_Contract");
    printAddress(address);
})();
