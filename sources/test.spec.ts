import { beginCell, toNano, Cell, fromNano, TransactionDescriptionGeneric, TransactionComputeVm } from "@ton/ton";
import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    printTransactionFees,
    prettyLogTransactions,
} from "@ton/sandbox";
import "@ton/test-utils";

import { Main } from "./output/sample_Main";
import { Role } from "./output/sample_Role";
import { Balance } from "./output/sample_Balance";

describe("contract", () => {
    let blockchain: Blockchain;
    let main: SandboxContract<Main>;
    let role: SandboxContract<Role>;
    let balance: SandboxContract<Balance>;

    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury("admin");
        deployer = await blockchain.treasury("deployer");
        user = await blockchain.treasury("user");

        main = await blockchain.openContract(await Main.fromInit(deployer.address));

        const deployResult = await main.send(
            deployer.getSender(),
            { value: toNano(1) },
            { $$type: "Create", owner: deployer.address }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: main.address,
            deploy: true,
            success: true,
        });
    });

    it("Check Contract Activate", async () => {
        console.log("1:" + (await main.getGetRoleAddress(0n)));
        console.log("2:" + (await main.getGetBalanceAddressInEachUser(0n, admin.address)));
    });

    it("Check Buying ", async () => {
        let roleAddr = await main.getGetRoleAddress(0n);
        role = await blockchain.openContract(await Role.fromAddress(roleAddr));

        let buyQty = 10n;
        const BuyResult = await role.send(
            user.getSender(),
            { value: toNano(1) },
            { $$type: "BuyShares", query_id: 0n, amount: buyQty }
        );
        expect(BuyResult.transactions).toHaveTransaction({
            from: user.address,
            to: role.address,
            success: true,
        });
        // console.log(printTransactionFees(BuyResult.transactions));
        // console.log(prettyLogTransactions(BuyResult.transactions));

        let supply = await role.getTotalSupply();
        expect(supply).toEqual(buyQty);

        // balance = await blockchain.openContract(await Balance.fromAddress(user.address));
        // expect(balance.getGetBalance()).toEqual(buyQty);
    });

    it("Check the Pricing", async () => {
        let roleAddr = await main.getGetRoleAddress(0n);
        role = await blockchain.openContract(await Role.fromAddress(roleAddr));

        let currentSupply = await role.getTotalSupply();
        let curentPrice = await role.getGetPricingData(1n);

        let buyQty = 35n;
        const BuyResult = await role.send(
            user.getSender(),
            { value: toNano(100) },
            { $$type: "BuyShares", query_id: 0n, amount: buyQty }
        );

        let afterSupply = await role.getTotalSupply();
        let afterPrice = await role.getGetPricingData(1n);
        expect(afterSupply).toEqual(currentSupply + buyQty);
        console.log("AfterSupply" + afterSupply);
        expect(afterPrice).toBeGreaterThan(curentPrice);

        let balanceAddr = await role.getGetBalanceAddress(user.address);
        balance = await blockchain.openContract(await Balance.fromAddress(balanceAddr));

        // let userBalance = await balance.getGetBalance();
        // console.log(userBalance);
        // console.log(printTransactionFees(BuyResult.transactions));
        // console.log(prettyLogTransactions(BuyResult.transactions));
    });

    it("test", async () => {
        // role = await blockchain.openContract(await Role.fromInit(main.address, 0n, admin.address));
        // console.log("...RoleAddress: " + role.address);
        let roleAddr = await main.getGetRoleAddress(0n);
        role = await blockchain.openContract(await Role.fromAddress(roleAddr));

        let buyAmount = 50n;
        let price = await role.getGetPricingData(buyAmount);
        console.log("Cost for: " + buyAmount + "keys: " + fromNano(price) + "TON");
    });

    it("Buy then Sell", async () => {
        // role = await blockchain.openContract(await Role.fromInit(main.address, 0n, admin.address));
        // console.log("✓ RoleAddress: " + role.address);

        let roleAddr = await main.getGetRoleAddress(0n);
        role = await blockchain.openContract(await Role.fromAddress(roleAddr));
        console.log("✓ ✓ RoleAddress: " + role.address);

        let supplyQty_0 = await role.getTotalSupply();
        console.log("init Supply: " + supplyQty_0);

        // Buy Shares
        let buyQty = 5n;
        const BuyResult = await role.send(
            user.getSender(),
            { value: toNano(100) },
            { $$type: "BuyShares", query_id: 0n, amount: buyQty }
        );
        expect(BuyResult.transactions).toHaveTransaction({
            from: user.address,
            to: role.address,
            success: true,
        });
        // console.log(printTransactionFees(BuyResult.transactions));
        // console.log(prettyLogTransactions(BuyResult.transactions));

        let balanceAddr = await role.getGetBalanceAddress(user.address);
        console.log("Balance Address[0]: " + balanceAddr);
        let balance = await blockchain.openContract(await Balance.fromAddress(balanceAddr));
        console.log("Balance Address[1]: " + balance.address);
        expect(balance.address).toEqualAddress(balanceAddr);

        // let userBalance = await balance.getGetBalance();
        // console.log(userBalance);
        // let balanceData = (await balance.getGetBalanceData()).owner;
        // console.log(balanceData);
        let supplyQty = await role.getTotalSupply();
        console.log("Supply(Before Sell): " + supplyQty);

        let sellQty = 3n;
        const SellResult = await balance.send(
            user.getSender(),
            { value: toNano(1) },
            { $$type: "Sell", query_id: 0n, amount: sellQty }
        );
        expect(SellResult.transactions).toHaveTransaction({
            from: user.address,
            to: balance.address,
            success: true,
        });
        let supplyQty_2 = await role.getTotalSupply();
        console.log("Supply(After Sell): " + supplyQty_2);

        console.log("SELL RESULT");
        console.log(printTransactionFees(SellResult.transactions));
        console.log(prettyLogTransactions(SellResult.transactions));

        // let endBalance = await balance.getGetBalance();
        // console.log(endBalance);
        // expect(endBalance).toEqual(buyQty - sellQty);
    });
});
