message Create {
    owner: Address;
}

message FinishedBuy {
    query_id: Int as uint64;
    charge_ton: Int as coins;
    amount: Int as uint16;
    final_supply: Int as uint16;
    original_sender: Address;
    index: Int as uint32;
}

message Redeem {
    query_id: Int as uint64;
    redeem_ton: Int as coins;
    amount: Int as uint16;
    final_supply: Int as uint16;
    index: Int as uint32;
    sender: Address;
}

message InitRole {
    admin: Address;
    owner: Address;
}

message BuyShares {
    query_id: Int as uint64;
    amount: Int as uint16;
}

message SellNotification {
    query_id: Int as uint64;
    amount: Int as uint16;
    sender: Address;
}

message Add {
    query_id: Int as uint64;
    charge_ton: Int as coins;
    amount: Int as uint16;
    final_supply: Int as uint16;   
    index: Int as uint32;
}

message Sell {
    query_id: Int as uint64;
    amount: Int as uint16;
}

struct BalanceData {
    main: Address;
    role: Address;
    owner: Address;
}

struct RoleData {
    main: Address;
    supply: Int as uint16;
    index: Int as uint32;
    admin: Address;
    owner: Address;
}