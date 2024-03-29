import "./message";
const minTonsForStorage: Int = ton("0.04");
const gasConsumption: Int = ton("0.04");

contract Main {
    index: Int as uint32 = 0;
    fee: Int as uint8;
    admin: Address;

    init(admin: Address) {
        self.admin = admin;
        self.fee = 50; // Basic point for the fee is 5%
    }

    receive(msg: Create) {
        require(context().sender == self.admin, "not admin");
        let initCode: StateInit = initOf Role(myAddress(), self.index, self.admin);
        self.index = self.index + 1;
        send(SendParameters{
            to: contractAddress(initCode),  
            value: 0,
            mode: SendRemainingValue,
            body: InitRole { admin: self.admin, owner: msg.owner }.toCell(),
            code: initCode.code,
            data: initCode.data
        });
    }

    receive(msg: FinishedBuy) {
        require(context().sender == self.get_balance_address_in_each_user(msg.index, msg.original_sender), "Only owner can finish buy shares");
        let value: Int = self.msgValue(context().value);
        let fee: Int = msg.charge_ton * self.fee / 1000; // 50 / 1000 = 5%
        self.manageFeeSending(fee, msg.index);

        let refund: Int = value - msg.charge_ton - fee - fee - ton("0.05");
        self.returnRest(refund, msg.original_sender, true);
    }

    receive(msg: Redeem) {
        let ctx: Context = context();
        require(ctx.sender == self.get_role_address(msg.index), "Only User contract can redeem shares");
        let value: Int = self.msgValue(context().value);
        let fee: Int = msg.redeem_ton * self.fee / 1000; 
        self.manageFeeSending(fee, msg.index);

        let refund: Int = value + msg.redeem_ton - fee - fee - ton("0.05"); // Extract buffer for us to send back
        self.returnRest(refund, msg.sender, false);  
    }

    fun manageFeeSending(fee: Int, index: Int) {
        send(SendParameters{
            to: self.admin, 
            value: fee, 
            mode: SendPayGasSeparately,
            bounce: false,
            body: "Protocol Fee".asComment()
        });
        send(SendParameters{
            to: self.get_role_address(index), 
            value: fee,
            mode: SendPayGasSeparately,
            bounce: false,
            body: "Subject Fee".asComment()
        });
    }
    
    fun returnRest(refund: Int, original_sender: Address, is_buy: Bool) {
        if (is_buy) {
            send(SendParameters{ // Refund the rest of the money
                to: original_sender, 
                value: refund,
                mode: SendPayGasSeparately,
                body: "Successfully bought shares".asComment()
            });
        } else {    
            send(SendParameters{
                to: original_sender, 
                value: refund,
                mode: SendPayGasSeparately,
                body: "Successfully sell shares".asComment()
            });   
        }
    }

    fun msgValue(msgValue: Int): Int {
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = minTonsForStorage - min(tonBalanceBeforeMsg, minTonsForStorage);
        msgValue = msgValue - (storageFee + gasConsumption);
        return msgValue;
    }

    get fun get_balance_address_in_each_user(index: Int, owner: Address): Address {
        let initCode: StateInit = initOf Balance(myAddress(), self.get_role_address(index), owner);
        return contractAddress(initCode);
    }

    get fun get_role_address(index: Int): Address { 
        let initCode: StateInit = initOf Role(myAddress(), index, self.admin);
        return contractAddress(initCode);
    }

    get fun get_index(): Int {
        return self.index;
    }
}

contract Role {
    main: Address;
    supply: Int as uint16 = 0;
    index: Int as uint32;
    admin: Address;
    owner: Address?;

    init(main: Address, index: Int, admin: Address) {
        self.main = main;
        self.index = index;
        self.admin = admin;
    }

    receive(msg: InitRole) {
        require(context().sender == self.main, "not main contract");
        self.owner = msg.owner;
        let value: Int = self.msgValue(context().value);
        send(SendParameters{
            to: self.admin,
            value: value,
            mode: SendPayGasSeparately,
            body: "Success".asComment()
        });
    }

    receive(msg: BuyShares) {
        let ctx: Context = context(); 
        require(ctx.value >= ton("0.15"), "Must pay at least 0.15 TON");

        let charge_ton: Int = self.getPrice(self.supply, msg.amount);
        require(ctx.value >= charge_ton + ton("0.15"), "Not enough money to buy shares");

        self.supply = self.supply + msg.amount;
        
        let remainingValueSendBack: Int = self.msgValue(ctx.value);
        let initCode: StateInit = initOf Balance(self.main, myAddress(), ctx.sender);
        send(SendParameters{
            to: contractAddress(initCode),
            value: remainingValueSendBack,
            mode: SendPayGasSeparately,
            body: Add { // add#7007df46, 0x7007df46
                query_id: msg.query_id,
                charge_ton: charge_ton,
                amount: msg.amount, 
                final_supply: self.supply,
                index: self.index
            }.toCell(), 
            bounce: false,
            code: initCode.code,
            data: initCode.data
        });
    }
    
    receive(msg: SellNotification) {
        require(context().sender == self.get_balance_address(msg.sender), "Only Balance can sell shares");

        self.supply = self.supply - msg.amount;
        require(self.supply >= 0, "Not enough shares to sell");

        let redeem_ton: Int = self.getPrice(self.supply, msg.amount);
        send(SendParameters{
            to: self.main,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: Redeem {
                query_id: msg.query_id,
                redeem_ton: redeem_ton,
                amount: msg.amount,
                final_supply: self.supply,
                index: self.index,
                sender: msg.sender
            }.toCell()
        });
    }

    receive(){}
    receive(msg: Slice) {}
    receive("Claim"){
        require(context().sender == self.owner, "Only owner can claim");
        send(SendParameters{
            to: self.owner!!,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false,
            body: "Claimed".asComment()
        });
    }
    
    fun getPrice(supply: Int, amount: Int): Int {
        if (supply == 0) {
            let sum1: Int = 0; 
            if (amount == 1) {
                let sum2: Int = 0;
                return (sum2 - sum1) * ton("1") / 16000;
            } else {
                let sum2: Int = ((supply - 1 + amount) * (supply + amount) * ( (2 * (supply + amount - 1)) + 1)) / 6;
                return (sum2 - sum1) * ton("1") / 16000;
            }
        } else {
            let sum1: Int = (supply - 1) * supply * (2 * (supply - 1) + 1) / 6;
            let sum2: Int = (supply + amount - 1) * (supply + amount) * (2 * (supply + amount - 1) + 1) / 6;
            return (sum2 - sum1) * ton("1") / 16000;
        }
    }

    fun msgValue(msgValue: Int): Int {
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = minTonsForStorage - min(tonBalanceBeforeMsg, minTonsForStorage);
        msgValue = msgValue - (storageFee + gasConsumption);
        return msgValue;
    }

    get fun get_balance_address(owner: Address): Address {
        let initCode: StateInit = initOf Balance(self.main, myAddress(), owner);
        return contractAddress(initCode);
    }

    get fun get_owner(): Address {
        return self.owner!!;
    }

    get fun totalSupply(): Int {
        return self.supply;
    }

    get fun get_pricing_data(key_qty: Int): Int {
        return self.getPrice(self.supply, key_qty);
    }
}

contract Balance {
    main: Address;
    role: Address;
    owner: Address;
    balance: Int as uint32 = 0;

    init(main: Address, role: Address, owner: Address) {
        self.main = main;
        self.role = role;
        self.owner = owner;
    }

    receive(msg: Add) {
        let ctx: Context = context(); 
        require(ctx.sender == self.role, "Only Profile can call");
        self.balance = self.balance + msg.amount;

        // Fallback message to remind the factory contract that the buy shares is finished
        self.forward(
            self.main,
            FinishedBuy { // 563eae5c
                query_id: msg.query_id,
                charge_ton: msg.charge_ton,
                amount: msg.amount,
                final_supply: msg.final_supply,
                original_sender: self.owner,
                index: msg.index
            }.toCell(),
            false,
            null
        );
    }

    receive(msg: Sell) {
        let ctx: Context = context(); 
        require(ctx.sender == self.owner, "Only owner can sell shares");

        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Not enough shares to sell");
        
        send(SendParameters{
            to: self.role,
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: SellNotification {
                query_id: msg.query_id,
                amount: msg.amount,
                sender: self.owner
            }.toCell()
        });
    }

    get fun get_balance(): Int {
        return self.balance;
    }

    get fun get_balanceData(): BalanceData {
        return BalanceData {
            main: self.main,
            role: self.role,
            owner: self.owner
        };
    }
}