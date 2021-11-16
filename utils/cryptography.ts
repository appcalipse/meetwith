import CryptoJS from 'crypto-js'

const encryptContent = (signature: string, data: string): string => {
    var ciphertext = CryptoJS.AES.encrypt(data, signature).toString();
    return ciphertext
}

const decryptContent = (signature: string, encodedData: string): string => {
    const message = CryptoJS.AES.decrypt(encodedData, signature).toString(CryptoJS.enc.Utf8)
    return message
}

export { encryptContent, decryptContent }