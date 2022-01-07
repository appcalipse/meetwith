import { ethers } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

interface AccountExtraProps {
    name: string,
    avatar?: string,
} 

export const resolveExtraInfo = async (address: string): Promise<AccountExtraProps | undefined> => {
    return await resolveENS(address)
}

const resolveENS = async (address: string): Promise<AccountExtraProps | undefined> => {

    let provider: JsonRpcProvider
    
    if(window.ethereum && window.ethereum.chainId === "0x1") {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
        provider = new ethers.providers.InfuraProvider("homestead", process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID);
    }

    const name = await provider.lookupAddress(address)

    if(!name) {
        return undefined
    }

    const resolver = await provider.getResolver(name);

    const validatedAddress = await resolver?.getAddress()

    // Check to be sure the reverse record is correct.
    if(address.toLowerCase() !== validatedAddress?.toLowerCase()) {
        return undefined
    }

    const avatarInfo = await resolver?.getText("avatar")
    const avatar = avatarInfo ? (await resolver?.getAvatar())?.url : undefined

    return {
        name,
        avatar
    }

}