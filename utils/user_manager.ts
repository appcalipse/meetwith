import Web3 from "web3";
import Web3Modal from "web3modal";
import { getCurrentAccount, getSignature, storeCurrentAccount } from './storage';
import { Account, PremiumAccount } from "../types/Account";
import { saveSignature } from "./storage";
import { getAccount, createAccount } from "./api_helper";
import { DEFAULT_MESSAGE } from "./constants";
import { AccountNotFoundError } from "./errors";
import dayjs from "./dayjs_extender";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { resolveExtraInfo } from "./rpc_helper";

export const ACCOUNT_CHANGED_BROADCAST_EVENT = 'account_changed'

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          infuraId: process.env.NEXT_PUBLIC_INFURA_ID
        }
      }
};

let web3: Web3;

const loginWithWallet = async (): Promise<Account | undefined> => {

    const web3Modal = new Web3Modal({
        cacheProvider: true, // optional
        providerOptions // required
    });

    try {
        const provider = await web3Modal.connect()
    
        web3 = new Web3(provider)

        provider!.on('accountsChanged', async (accounts: string[]) => {
            const storeCurrentAccount = getCurrentAccount()
            if(accounts[0].toLocaleLowerCase() !== storeCurrentAccount) {
                const channel = new BroadcastChannel(ACCOUNT_CHANGED_BROADCAST_EVENT);
                channel.postMessage("")
                channel.close()
            }
          })
  
        const accounts = await web3.eth.getAccounts()
        return await createOrFetchAccount(accounts[0].toLocaleLowerCase(), dayjs.tz.guess())
    } catch(err) {
        return undefined
    }
}

const signDefaultMessage = async (accountAddress: string, nonce: number): Promise<string> => {
    const signature = await web3.eth.personal.sign(DEFAULT_MESSAGE(nonce), accountAddress, 'meetwithwallet.xyz');
    saveSignature(accountAddress, signature)
    return signature;
}

const createOrFetchAccount = async (accountAddress: string, timezone: string): Promise<Account> => {

    dayjs.tz.setDefault(timezone)
    
    let account: Account;

    try {
        account = await getAccount(accountAddress)
    } catch (e) {
        if(e instanceof AccountNotFoundError) {
            const nonce = Number(Math.random().toString(8).substring(2,10))
            const signature = await signDefaultMessage(accountAddress, nonce)
            account = await createAccount(accountAddress, signature, timezone, nonce)
        } else {
            throw e
        }
    }

    const signature = getSignature(account.address)

    const extraInfo = await resolveExtraInfo(account.address)

    if (!signature) {
        await signDefaultMessage(account.address, account.nonce)
    }

    storeCurrentAccount(account)

    return {...account, ...extraInfo}
}

const getAccountDisplayName = (account: Account | PremiumAccount, forceCustomDomain?: boolean): string => {
    if(forceCustomDomain) {
        return account.name || ellipsizeAddress(account.address)
    }else {
        return ellipsizeAddress(account.address)
    }
}

const ellipsizeAddress = (address: string) => `${address.substr(0,5)}...${address.substr(address.length - 5)}`

export { loginWithWallet, signDefaultMessage, createOrFetchAccount, ellipsizeAddress, getAccountDisplayName, web3};