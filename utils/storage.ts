import { User } from "../types/User";

const SIGNATURE_KEY = 'current_user_sig'

const saveSignature = (user: User, signature: string) => {
    window.localStorage.removeItem(`${SIGNATURE_KEY}:${user.address}`)
    window.localStorage.setItem(`${SIGNATURE_KEY}:${user.address}`, signature);
}

const getSignature = (user: User): string | null => {
    return window.localStorage.getItem(`${SIGNATURE_KEY}:${user.address}`);
}

export { saveSignature, getSignature }