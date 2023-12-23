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
        Stocks.delete(payload);
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
        const updatedStockDetails: typeof StockDetails = {
            stockSymbol: stock.stockSymbol,
            stockName: stock.stockName,
            stockPrice: stock.stockPrice,
            Quantity: stockDetails ? stockDetails.Quantity + payload.quantity : payload.quantity,
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
        const updatedStockDetails: typeof StockDetails = {
            stockSymbol: stock.stockSymbol,
            stockName: stock.stockName,
            stockPrice: stock.stockPrice,
            Quantity: stockDetails.Quantity - payload.quantity,
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
            ListOfStockDetails.delete(stockDetailsKey);
        }
        return Ok(updatedAccount);
    }),
    getPortofolio: query([], Result(Vec(StockDetails), Error), () => {
        if (!isAccountExists(ic.caller())) {
            return Err({ Forbidden: 'Please make an account first' });
        }
        const portofolio: typeof StockDetails[] = [];
        ListOfStockDetails.forEach((stockDetails : typeof StockDetails) => {
            if (stockDetails.Owner === ic.caller()) {
                portofolio.push(stockDetails);
            }
        });
        return Ok(portofolio);
    }),

})