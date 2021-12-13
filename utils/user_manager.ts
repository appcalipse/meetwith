import Web3 from "web3";
import Web3Modal from "web3modal";
import { getSignature, storeCurrentAccount } from './storage';
import { Account, PremiumAccount, SpecialDomainType } from "../types/Account";
import { saveSignature } from "./storage";
import { getAccount, createAccount } from "./api_helper";
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import { ethers } from "ethers";
import { DEFAULT_MESSAGE } from "./constants";

const providerOptions = {
    /* See Provider Options Section */
};

let web3: Web3;

const loginWithWallet = async (): Promise<Account> => {

    const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: true, // optional
        providerOptions // required
    });

    const provider = await web3Modal.connect()

    web3 = new Web3(provider)

    const accounts = await web3.eth.getAccounts()
    return await createOrFetchAccount(accounts[0], Intl.DateTimeFormat().resolvedOptions().timeZone)
}

const signDefaultMessage = async (accountAddress: string): Promise<string> => {
    const signature = await web3.eth.personal.sign(DEFAULT_MESSAGE, accountAddress, '');
    saveSignature(accountAddress, signature)
    return signature;
}

const createOrFetchAccount = async (accountAddress: string, timezone: string): Promise<Account> => {

    let account: Account;

    try {
        account = await getAccount(accountAddress)
    } catch (e) {
        const signature = await signDefaultMessage(accountAddress)
        account = await createAccount(accountAddress, signature, timezone)
    }

    const signature = getSignature(accountAddress)

    if (!signature) {
        await signDefaultMessage(accountAddress)
    }

    storeCurrentAccount(account)

    return account
}

const getCustomDomainName = async (address: string, type: SpecialDomainType) => {
    
    if(type === SpecialDomainType.ENS) {
    const provider = new ethers.providers.JsonRpcProvider('https://main-light.eth.linkpool.io/');
    
    const ens = new ENS({ provider, ensAddress: getEnsAddress('1') })
    
let result = await ens.getName(address)
let name = result.name 
// Check to be sure the reverse record is correct.
if(address != await ens.name(result.name).getAddress()) {
  name = null;
}

return name
    }
    return null
}

const getAccountDisplayName = (account: Account | PremiumAccount): string => {
    if((account as PremiumAccount).special_domain_type) {
        return ''
} else {
    return ellipsizeAddress(account.address)
}
}

const ellipsizeAddress = (address: string) => `${address.substr(0,5)}...${address.substr(address.length - 5)}`

export { loginWithWallet, signDefaultMessage, createOrFetchAccount, ellipsizeAddress, getCustomDomainName, getAccountDisplayName, web3};