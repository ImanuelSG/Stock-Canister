import {
    Canister,
    Err,
    Ok,
    Principal,
    Record,
    Result,
    StableBTreeMap,
    Variant,
    Vec,
    ic,
    nat64,
    query,
    text,
    update,
    Void
  } from 'azle';



let Stock = Record({
    stockSymbol: text,
    stockName: text,
    stockPrice: nat64,
    availableQuantity: nat64,
});

let StockDetails = Record({
    stockSymbol: text,
    stockName: text,
    stockPrice: nat64,
    Quantity: nat64,
    Total: nat64,
    Owner: Principal,
})

let Account = Record({
    ID: Principal,
    fullName: text,
    balance: nat64,
    createdAt: nat64,
    updatedAt: nat64,
})

const AccountPayload = Record({
    username: text,
})
const BalancePayload = Record({
    amount : nat64,

})
const StockPayload = Record({
    stockSymbol: text,
    stockName: text,
    stockPrice: nat64,
    availableQuantity: nat64,
})

const BuyPayload = Record({
    stockSymbol: text,
    quantity: nat64,
})

const Error = Variant({
    Forbidden: text,
    BadRequest: text,
  });


let Accounts = StableBTreeMap(Principal,Account,0);
let Stocks = StableBTreeMap(text, Stock, 1);
let ListOfStockDetails = StableBTreeMap(text,StockDetails,2);

const isAccountExists = (id:Principal) => Accounts.containsKey(id);
const isStockExists = (stockSymbol:text) => Stocks.containsKey(stockSymbol);

export default Canister({

    createAccount: update([AccountPayload], Result(Account, Error), (payload) => {
        if(!payload.username){
            return Err({BadRequest : 'No Name Provided'})
        }
        if (isAccountExists(ic.caller())){
            return Err({BadRequest: 'You already made an account'})
        }
        const newAccount  : typeof Account = {
            ID : ic.caller(),
            balance: 0n,
            createdAt: ic.time(),
            updatedAt: ic.time(),
            fullName: payload.username,
            
        }
        Accounts.insert(ic.caller(), newAccount);
        return Ok(newAccount);
    }),
    //TopUpBalance
    topUpBalance: update([BalancePayload], Result(Account, Error), (payload)=>{
        if(!isAccountExists(ic.caller())){
            return Err({Forbidden: 'Please make an account first'})
        }
        if(!payload.amount){
            return Err({BadRequest: 'No Amount Provided'})
        }
        if(payload.amount <= 0){
            return Err({BadRequest: 'Please enter a valid topup amount (>0)'})
        }
        const account : typeof Account = Accounts.get(ic.caller()).Some;
        const updatedAccount : typeof Account = {
            ID : account.ID,
            balance : account.balance += payload.amount,
            createdAt: account.createdAt,
            updatedAt: ic.time(),
            fullName: account.fullName,
  
        };
        Accounts.insert(account.ID, updatedAccount)
        return Ok(updatedAccount)

    }),
    //Create a Virtual Stock
    createStock: update([StockPayload], Result(Stock, Error), (payload) => {
        if(!payload.availableQuantity){
            return Err({BadRequest : 'No quantity Provided'})
        }
        if(!payload.stockName){
            return Err({BadRequest : 'No stockName Provided'})
        }
        if(!payload.stockPrice){
            return Err({BadRequest : 'No stockPrice Provided'})
        }
        if(!payload.stockSymbol){
            return Err({BadRequest : 'No stockSymbol Provided'})
        }
        const newStock : typeof Stock = {
            stockSymbol: payload.stockSymbol,
            stockName: payload.stockName,
            stockPrice: payload.stockPrice,
            availableQuantity: payload.availableQuantity,
        }
        Stocks.insert(payload.stockSymbol, newStock);
        return Ok(newStock);
    }),

    deleteStock: update([text], Result(Stock, Error), (payload) => {
        if(!payload){
            return Err({BadRequest : 'No stockSymbol Provided'})
        }
        if(!isStockExists(payload)){
            return Err({BadRequest : 'Stock Doesnt Exist'})
        }
        const stock : typeof Stock = Stocks.get(payload).Some;
        Stocks.remove(payload);
        return Ok(stock);
    }),

    buyStock: update([BuyPayload], Result(Account, Error), (payload) => {
        if (!isAccountExists(ic.caller())) {
            return Err({ Forbidden: 'Please make an account first' });
        }
        if (!isStockExists(payload.stockSymbol)) {
            return Err({ BadRequest: 'Stock Doesnt Exist' });
        }
        if (!payload.quantity) {
            return Err({ BadRequest: 'Please enter a valid quantity' });
        }
        if (payload.quantity <= 0) {
            return Err({ BadRequest: 'Please enter a valid quantity (>0)' });
        }
        const account: typeof Account = Accounts.get(ic.caller()).Some;
        const stock: typeof Stock = Stocks.get(payload.stockSymbol).Some;
        const stockDetailsKey = `${account.fullName}${stock.stockSymbol}`;
        const stockDetails: typeof StockDetails = ListOfStockDetails.get(stockDetailsKey).Some;
        if (account.balance < stock.stockPrice * payload.quantity) {
            return Err({ BadRequest: 'Insufficient Balance' });
        }
        if (stock.availableQuantity < payload.quantity) {
            return Err({ BadRequest: 'Insufficient Stock' });
        }
        const newQuantity = stockDetails ? stockDetails.Quantity + payload.quantity : payload.quantity;

        const updatedStockDetails: typeof StockDetails = {
            stockSymbol: stock.stockSymbol,
            stockName: stock.stockName,
            stockPrice: stock.stockPrice,
            Quantity: newQuantity,
            Total: newQuantity * stock.stockPrice,
            Owner: ic.caller(),
        };
        const updatedAccount: typeof Account = {
            ID: account.ID,
            balance: account.balance - stock.stockPrice * payload.quantity,
            createdAt: account.createdAt,
            updatedAt: ic.time(),
            fullName: account.fullName,
        };

        stock.availableQuantity -= payload.quantity;
        Stocks.insert(stock.stockSymbol, stock);
        Accounts.insert(account.ID, updatedAccount);
        ListOfStockDetails.insert(stockDetailsKey, updatedStockDetails);
        return Ok(updatedAccount);
    }),

    sellstock: update([BuyPayload], Result(Account, Error), (payload) => {
        if (!isAccountExists(ic.caller())) {
            return Err({ Forbidden: 'Please make an account first' });
        }
        if (!isStockExists(payload.stockSymbol)) {
            return Err({ BadRequest: 'Stock Doesnt Exist' });
        }
        if (!payload.quantity) {
            return Err({ BadRequest: 'Please enter a valid quantity' });
        }
        if (payload.quantity <= 0) {
            return Err({ BadRequest: 'Please enter a valid quantity (>0)' });
        }
        const account: typeof Account = Accounts.get(ic.caller()).Some;
        const stock: typeof Stock = Stocks.get(payload.stockSymbol).Some;
        const stockDetailsKey = `${account.fullName}${stock.stockSymbol}`;
        const stockDetails: typeof StockDetails = ListOfStockDetails.get(stockDetailsKey).Some;
        if (!stockDetails || stockDetails.Quantity < payload.quantity) {
            return Err({ BadRequest: 'Insufficient Stock' });
        }
        const newQuantity = stockDetails.Quantity - payload.quantity;
        const updatedStockDetails: typeof StockDetails = {
            stockSymbol: stock.stockSymbol,
            stockName: stock.stockName,
            stockPrice: stock.stockPrice,
            Quantity: newQuantity,
            Total: newQuantity * stock.stockPrice,
            Owner: ic.caller(),
        };
        const updatedAccount: typeof Account = {
            ID: account.ID,
            balance: account.balance + stock.stockPrice * payload.quantity,
            createdAt: account.createdAt,
            updatedAt: ic.time(),
            fullName: account.fullName,
        };
        stock.availableQuantity += payload.quantity;
        Stocks.insert(stock.stockSymbol, stock);
        Accounts.insert(account.ID, updatedAccount);
        if (updatedStockDetails.Quantity > 0) {
            ListOfStockDetails.insert(stockDetailsKey, updatedStockDetails);
        } else {
            ListOfStockDetails.remove(stockDetailsKey);
        }
        return Ok(updatedAccount);
    }),
    getPortofolio: query([], Result(Record({portfolio: Vec(StockDetails), totalAsset: nat64}), Error), () => {
        if (!isAccountExists(ic.caller())) {
            return Err({ Forbidden: 'Please make an account first' });
        }
        const stockdetails = ListOfStockDetails.values();
        const portfolio = stockdetails.filter((stockdetail: typeof StockDetails) => stockdetail.Owner.toText() === ic.caller().toText());
        
        let totalAsset = 0n;
        portfolio.forEach((stockdetail: typeof StockDetails) => {
            totalAsset += stockdetail.Total;
        });
        return Ok({
            portfolio: portfolio,
            totalAsset: totalAsset,
        });
    }),
    getStocks: query([], Result(Vec(Stock), Error), () => {
        if(!Stocks){
            return Err({BadRequest : 'No Stocks'})
        }
        if(!isAccountExists(ic.caller())){
            return Err({Forbidden : 'Please make an account first'})
        }
        return Ok(Stocks.values());
    }),
    getStockDetails: query([text], Result(StockDetails, Error), (payload) => {
        if (!isStockExists(payload)) {
            return Err({ BadRequest: 'Stock Doesnt Exist' });
        }
        if (!isAccountExists(ic.caller())) {
            return Err({ Forbidden: 'Please make an account first' });
        }
        
        const user = Accounts.get(ic.caller()).Some;
        const stockDetails: typeof StockDetails = ListOfStockDetails.get(`${user.fullName}${payload}`).Some;
        if (!stockDetails) {
            return Err({ BadRequest: 'Stock Details Doesnt Exist ' });
        }
        return Ok(stockDetails);
    }),
    resetdetail: update([], Void, () => {
        const dumpstockdetails = ListOfStockDetails.items();
        dumpstockdetails.forEach((key:text) => {
            ListOfStockDetails.remove(key);
        });
    }),

})