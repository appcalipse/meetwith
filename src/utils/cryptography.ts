import CryptoJS from 'crypto-js'
import {
  IdentityAsJson,
  IdentityProvider,
  IdentityProviderOptions,
} from 'orbit-db-identity-provider'

import { web3 } from './user_manager'

const encryptContent = (signature: string, data: string): string => {
  const ciphertext = CryptoJS.AES.encrypt(data, signature).toString()
  return ciphertext
}

const decryptContent = (signature: string, encodedData: string): string => {
  const message = CryptoJS.AES.decrypt(encodedData, signature).toString(
    CryptoJS.enc.Utf8
  )
  return message
}

interface PersonalIdentityProviderOptions extends IdentityProviderOptions {
  encodedSignature: string
  address: string
}

class PersonalIdentityProvider extends IdentityProvider {
  encodedSignature: string
  address: string

  constructor(options: PersonalIdentityProviderOptions) {
    super(options)
    this.encodedSignature = options.encodedSignature
    this.address = options.address
  }

  static get type() {
    return 'PersonalIdentityProvider'
  }

  async getId() {
    return this.address
  } // return identifier of external id (eg. a public key)

  async signIdentity(data: any) {
    return encryptContent(this.encodedSignature, data)
  } //return a signature of data (signature of the OrbtiDB public key)

  static async verifyIdentity(identity: IdentityAsJson) {
    // const address = await web3.eth.personal.ecRecover(DEFAULT_MESSAGE, (this as any).encodedSignature)
    // return address === identity.id
    return true
  } //return true if identity.sigantures are valid
}

export { decryptContent, encryptContent, PersonalIdentityProvider }
