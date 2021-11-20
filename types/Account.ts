export interface Account {
    _id: string,
    address: string,
    pubKey: string,
    encodedSignature: string,
    meetingsDBAddress: string,
}

export interface PremiumAccount extends Account {
    ens: string
}