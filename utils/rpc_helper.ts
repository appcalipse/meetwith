import { Avatar } from "@ethersproject/providers/lib/base-provider";
import { BigNumber, ethers } from "ethers";
import { hexConcat, hexDataSlice, hexZeroPad } from "ethers/lib/utils";
import { toUtf8String } from "@ethersproject/strings";
import { JsonRpcProvider } from "@ethersproject/providers";
import * as Sentry from '@sentry/browser'

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
    if(address.toLocaleLowerCase() !== validatedAddress?.toLocaleLowerCase()) {
        return undefined
    }
    
    const avatarInfo = await resolver?.getText("avatar")
    const avatar = avatarInfo ? (await getAvatar(address, avatarInfo!, provider))?.url : undefined

    return {
        name,
        avatar
    }

}

const matchers = [
    new RegExp("^(https):/\/(.*)$", "i"),
    new RegExp("^(data):(.*)$", "i"),
    new RegExp("^(ipfs):/\/(.*)$", "i"),
    new RegExp("^eip155:[0-9]+/(erc[0-9]+):(.*)$", "i"),
];


const getAvatar = async (owner: string, avatar: string, provider: JsonRpcProvider): Promise<Avatar | undefined> =>{
    const linkage: Array<{ type: string, content: string }> = [ ];
    try {
        if (avatar == null) { return undefined; }

        for (let i = 0; i < matchers.length; i++) {
            const match = avatar.match(matchers[i]);

            if (match == null) { continue; }
            switch (match[1]) {
                case "https":
                    linkage.push({ type: "url", content: avatar });
                    return { linkage, url: avatar };

                case "data":
                    linkage.push({ type: "data", content: avatar });
                    return { linkage, url: avatar };

                case "ipfs":
                    linkage.push({ type: "ipfs", content: avatar });
                    return { linkage, url: `https:/\/gateway.ipfs.io/ipfs/${ avatar.substring(7) }` }

                case "erc721":
                case "erc1155": {
                    // Depending on the ERC type, use tokenURI(uint256) or url(uint256)
                    const selector = (match[1] === "erc721") ? "0xc87b56dd": "0x0e89341c";
                    linkage.push({ type: match[1], content: avatar });

                    const comps = (match[2] || "").split("/");
                    if (comps.length !== 2) { return undefined; }

                    const addr = await provider.formatter.address(comps[0]);
                    const tokenId = hexZeroPad(BigNumber.from(comps[1]).toHexString(), 32);

                    // Check that this account owns the token
                    if (match[1] === "erc721") {
                        // ownerOf(uint256 tokenId)
                        const tokenOwner = provider.formatter.callAddress(await provider.call({
                            to: addr, data: hexConcat([ "0x6352211e", tokenId ])
                        }));
                        if (owner !== tokenOwner) { return undefined; }
                        linkage.push({ type: "owner", content: tokenOwner });

                    } else if (match[1] === "erc1155") {
                        // balanceOf(address owner, uint256 tokenId)
                        const balance = BigNumber.from(await provider.call({
                            to: addr, data: hexConcat([ "0x00fdd58e", hexZeroPad(owner, 32), tokenId ])
                        }));
                        if (balance.isZero()) { return undefined; }
                        linkage.push({ type: "balance", content: balance.toString() });
                    }

                    // Call the token contract for the metadata URL
                    const tx = {
                        to: provider.formatter.address(comps[0]),
                        data: hexConcat([ selector, tokenId ])
                    };
                    let metadataUrl = _parseString(await provider.call(tx))
                    if (metadataUrl == null) { return undefined; }
                    linkage.push({ type: "metadata-url", content: metadataUrl });

                    // ERC-1155 allows a generic {id} in the URL
                    if (match[1] === "erc1155") {
                        metadataUrl = metadataUrl.replace("{id}", tokenId.substring(2));
                    }

                    // Get the token metadata
                    const metadata = await (await fetch(metadataUrl)).json();
                    console.log(metadata)

                    // Pull the image URL out
                    if (!metadata || typeof(metadata.image) !== "string" || (!metadata.image.match(/^https:\/\//i) && (!metadata.image.match(/^ipfs:\/\//i)))) {
                        return undefined;
                    }
                    if(metadata.image.match(/^ipfs:\/\//i)) {
                        metadata.image = "https://ipfs.io/ipfs/" + metadata.image.substring(7)
                    }
                    linkage.push({ type: "metadata", content: JSON.stringify(metadata) });
                    linkage.push({ type: "url", content: metadata.image });

                    return { linkage, url: metadata.image };
                }
            }
        }
    } catch (error) { 
        console.log(error)
        Sentry.captureException(error);
    }

    return undefined;
}

function _parseString(result: string): null | string {
    try {
        // @ts-ignore
        return toUtf8String(_parseBytes(result));
    } catch(error) { }
    return null;
}

function _parseBytes(result: any): null | string {
    if (result === "0x") { return null; }

    const offset = BigNumber.from(hexDataSlice(result, 0, 32)).toNumber();
    const length = BigNumber.from(hexDataSlice(result, offset, offset + 32)).toNumber();
    return hexDataSlice(result, offset + 32, offset + 32 + length);
}
