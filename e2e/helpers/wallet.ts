import { ethers } from 'ethers'

import { DEFAULT_MESSAGE } from './constants'

export interface TestWallet {
  address: string
  privateKey: string
  signMessage: (nonce: number) => Promise<string>
}

/**
 * Generate a random test wallet for E2E testing.
 * Uses ethers v5 Wallet which automatically prepends the EIP-191 prefix
 * when calling signMessage(), matching what checkSignature() expects.
 */
export function generateTestWallet(): TestWallet {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    signMessage: async (nonce: number) => {
      const message = DEFAULT_MESSAGE(nonce)
      return wallet.signMessage(message)
    },
  }
}

/**
 * Create a test wallet from a known private key (deterministic).
 */
export function createTestWallet(privateKey: string): TestWallet {
  const wallet = new ethers.Wallet(privateKey)
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    signMessage: async (nonce: number) => {
      const message = DEFAULT_MESSAGE(nonce)
      return wallet.signMessage(message)
    },
  }
}
