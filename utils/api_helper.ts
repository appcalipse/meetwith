import { Account } from "../types/Account";
import { MeetingEncrypted } from "../types/Meeting";
import { apiUrl } from "./constants";
import { AccountNotFoundError } from "./errors";

export const internalFetch = async (path: string, method = 'GET', body?: any, options = {}): Promise<object> => {

    const response = await fetch(`${apiUrl}${path}`,
        {
            method,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'account_address': '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            ...options,
            body: (body && JSON.stringify(body)) || null
        }
    )
    if (response.status === 200) {
        return await response.json();
    }

    return response
}

export const getAccount = async (identifer: string): Promise<Account> => {
    try {
        return await internalFetch(`/accounts/${identifer}`) as Account
    } catch (e) {
        throw new AccountNotFoundError('User not found');
    }
}

export const createAccount = async (address: string, signature: string): Promise<Account> => {
    return await internalFetch(`/accounts`, 'POST', { address, signature }) as Account
}

export const createMeeting = async (meeting: any): Promise<MeetingEncrypted> => {
    return await internalFetch(`/meetings`, 'POST', meeting) as MeetingEncrypted
}

export const getMeetings = async (accountIdentifier: string, start?: Date, end?: Date): Promise<MeetingEncrypted[]> => {
    return await internalFetch(`/meetings/${accountIdentifier}?start=${start?.getTime() || undefined}&end=${end?.getTime() || undefined}`) as Meeting[]
}

export const subscribeToWaitlist = async (email: string): Promise<boolean> => {
    const result = await internalFetch(`/subscribe`, 'POST', { email })
    return (result as any).success
}

export const getMeeting = async (meeting_id: string): Promise<MeetingEncrypted> => {
    return await internalFetch(`/meetings/meeting/${meeting_id}`) as MeetingEncrypted
}
