const SIGNATURE_KEY = 'current_user_sig'

const saveSignature = (address: string, signature: string) => {
    window.localStorage.removeItem(`${SIGNATURE_KEY}:${address}`)
    window.localStorage.setItem(`${SIGNATURE_KEY}:${address}`, signature);
}

const getSignature = (address: string): string | null => {
    return window.localStorage.getItem(`${SIGNATURE_KEY}:${address}`);
}

export { saveSignature, getSignature }