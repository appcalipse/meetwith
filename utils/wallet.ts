import Web3 from "web3";
import Web3Modal from "web3modal";
import { RegisteredUser, User } from "../models/User";
import { createOrFetchUser } from "./user_manager";

const DEFAULT_MESSAGE = 'Welcome to meetwith.wallet! Please sign this message to make your experience safe.'

let web3: Web3;

const loginWithWallet = async (): Promise<RegisteredUser> => {

    const providerOptions = {
        /* See Provider Options Section */
    };

    const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: true, // optional
        providerOptions // required
    });

    const provider = await web3Modal.connect();

    web3 = new Web3(provider);

    const accounts = await web3.eth.getAccounts();
    const userAccount = await createOrFetchUser(accounts[0])
    return userAccount;
}

const signDefaultMessage = async (userAccount: User): Promise<string> => {
    const signature = await web3.eth.personal.sign(`${DEFAULT_MESSAGE}`, userAccount.address, userAccount.address);
    (window as any).signature = signature;
    return signature;
}

export { loginWithWallet, web3, signDefaultMessage };
