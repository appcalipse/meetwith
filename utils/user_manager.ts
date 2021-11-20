import Web3 from "web3";
import Web3Modal from "web3modal";
import { getAccountsDB, initAccountDBForWallet } from './database';
import { getSignature } from './storage';
import { Account } from "../types/Account";
import { saveSignature } from "./storage";

const DEFAULT_MESSAGE = 'Welcome to meetwith.wallet! Please sign this message to make your experience safe.'

let web3: Web3;

const loginWithWallet = async (): Promise<Account> => {

    const providerOptions = {
        /* See Provider Options Section */
    };

    const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: true, // optional
        providerOptions // required
    });

    const provider = await web3Modal.connect()

    web3 = new Web3(provider)

    const accounts = await web3.eth.getAccounts()
    return await createOrFetchAccount(accounts[0])
}

const signDefaultMessage = async (accountAddress: string): Promise<string> => {
    const signature = await web3.eth.personal.sign(`${DEFAULT_MESSAGE}`, accountAddress, accountAddress);
    saveSignature(accountAddress, signature)
    return signature;
}

const createOrFetchAccount = async (accountAddress: string): Promise<Account> => {

    const accountsDB = await getAccountsDB()
    let account = accountsDB.get(accountAddress)
    accountsDB.close()

    if (!account) {
        account = await initAccountDBForWallet(accountAddress)
    }

    const signature = getSignature(accountAddress)

    if (!signature) {
        await signDefaultMessage(accountAddress)
    }

    return account
}

export { loginWithWallet, web3, signDefaultMessage, createOrFetchAccount };