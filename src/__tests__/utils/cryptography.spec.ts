import CryptoJS from 'crypto-js'
import { Encrypted } from 'eth-crypto'

// Mock window.location for decryptContent tests
delete (global as any).window
;(global as any).window = { location: { assign: jest.fn() } }

import {
  checkSignature,
  decryptContent,
  encryptContent,
  mockEncrypted,
  simpleHash,
} from '@/utils/cryptography'

describe('cryptography', () => {
  describe('simpleHash', () => {
    it('should create consistent MD5 hashes', () => {
      const hash1 = simpleHash('test content')
      const hash2 = simpleHash('test content')
      expect(hash1).toBe(hash2)
    })

    it('should create different hashes for different content', () => {
      const hash1 = simpleHash('content1')
      const hash2 = simpleHash('content2')
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty strings', () => {
      const hash = simpleHash('')
      expect(hash).toBeTruthy()
      expect(typeof hash).toBe('string')
    })

    it('should create hex format hash', () => {
      const hash = simpleHash('test')
      expect(hash).toMatch(/^[a-f0-9]{32}$/)
    })
  })

  describe('mockEncrypted', () => {
    it('should have correct structure', () => {
      expect(mockEncrypted).toHaveProperty('ciphertext')
      expect(mockEncrypted).toHaveProperty('ephemPublicKey')
      expect(mockEncrypted).toHaveProperty('iv')
      expect(mockEncrypted).toHaveProperty('mac')
    })

    it('should have empty string values', () => {
      expect(mockEncrypted.ciphertext).toBe('')
      expect(mockEncrypted.ephemPublicKey).toBe('')
      expect(mockEncrypted.iv).toBe('')
      expect(mockEncrypted.mac).toBe('')
    })
  })

  describe('encryptContent', () => {
    it('should encrypt data with signature', () => {
      const signature = 'test-signature'
      const data = 'sensitive data'
      const encrypted = encryptContent(signature, data)

      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(data)
    })

    it('should produce different ciphertext for different data', () => {
      const signature = 'test-signature'
      const encrypted1 = encryptContent(signature, 'data1')
      const encrypted2 = encryptContent(signature, 'data2')

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty data', () => {
      const signature = 'test-signature'
      const encrypted = encryptContent(signature, '')

      expect(encrypted).toBeTruthy()
    })
  })

  describe('decryptContent', () => {
    it('should decrypt previously encrypted data', () => {
      const signature = 'test-signature'
      const originalData = 'sensitive data'

      const encrypted = encryptContent(signature, originalData)
      const decrypted = decryptContent(signature, encrypted)

      expect(decrypted).toBe(originalData)
    })

    it('should handle empty data', () => {
      const signature = 'test-signature'
      const encrypted = encryptContent(signature, '')
      const decrypted = decryptContent(signature, encrypted)

      expect(decrypted).toBe('')
    })

    it('should fail with wrong signature', () => {
      const signature = 'test-signature'
      const wrongSignature = 'wrong-signature'
      const data = 'sensitive data'

      const encrypted = encryptContent(signature, data)
      const decrypted = decryptContent(wrongSignature, encrypted)

      expect(decrypted).not.toBe(data)
    })

    it('should handle special characters', () => {
      const signature = 'test-signature'
      const specialData = '!@#$%^&*()_+{}[]|:;<>?,./'

      const encrypted = encryptContent(signature, specialData)
      const decrypted = decryptContent(signature, encrypted)

      expect(decrypted).toBe(specialData)
    })

    it('should handle JSON data', () => {
      const signature = 'test-signature'
      const jsonData = JSON.stringify({ key: 'value', num: 123 })

      const encrypted = encryptContent(signature, jsonData)
      const decrypted = decryptContent(signature, encrypted)

      expect(decrypted).toBe(jsonData)
    })
  })

  describe('checkSignature', () => {
    it('should verify valid signatures', () => {
      const mockSignature =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
      const nonce = 12345

      expect(() => checkSignature(mockSignature, nonce)).not.toThrow()
    })

    it('should return an address', () => {
      const mockSignature =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
      const nonce = 12345

      const result = checkSignature(mockSignature, nonce)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result.startsWith('0x')).toBe(true)
    })
  })
})
