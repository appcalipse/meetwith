export interface User {
    address: string,
    pubKey: string
}

export interface RegisteredUser extends User {
    pvtKey: string,
    internalAddress?: string,
}