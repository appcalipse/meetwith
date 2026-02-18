import {
  isValidEmail,
  isValidEVMAddress,
  isValidEthereumDomain,
  isEthereumAddressOrDomain,
  isValidUrl,
  isValidSlug,
  isEmptyString,
} from '@/utils/validations'

describe('validations', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('test+tag@example.com')).toBe(true)
      expect(isValidEmail('user123@test-domain.org')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail(undefined)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidEmail('test..email@example.com')).toBe(false)
      expect(isValidEmail('test@example')).toBe(false)
      expect(isValidEmail('test@.com')).toBe(false)
    })
  })

  describe('isValidEVMAddress', () => {
    it('should validate correct EVM addresses', () => {
      expect(isValidEVMAddress('0x1234567890123456789012345678901234567890')).toBe(true)
      expect(isValidEVMAddress('0xABCDEF1234567890123456789012345678901234')).toBe(true)
      expect(isValidEVMAddress('0xabcdef1234567890123456789012345678901234')).toBe(true)
    })

    it('should reject invalid EVM addresses', () => {
      expect(isValidEVMAddress('0x123')).toBe(false)
      expect(isValidEVMAddress('1234567890123456789012345678901234567890')).toBe(false)
      expect(isValidEVMAddress('0xGHIJKL1234567890123456789012345678901234')).toBe(false)
      expect(isValidEVMAddress('')).toBe(false)
      expect(isValidEVMAddress('0x')).toBe(false)
    })
  })

  describe('isValidEthereumDomain', () => {
    it('should validate ENS domains', () => {
      expect(isValidEthereumDomain('vitalik.eth')).toBe(true)
      expect(isValidEthereumDomain('test-domain.eth')).toBe(true)
      expect(isValidEthereumDomain('my.wallet.eth')).toBe(true)
    })

    it('should reject non-ENS domains', () => {
      expect(isValidEthereumDomain('example.com')).toBe(false)
      expect(isValidEthereumDomain('test.xyz')).toBe(false)
      expect(isValidEthereumDomain('wallet')).toBe(false)
      expect(isValidEthereumDomain('')).toBe(false)
    })
  })

  describe('isEthereumAddressOrDomain', () => {
    it('should validate both addresses and domains', () => {
      expect(isEthereumAddressOrDomain('0x1234567890123456789012345678901234567890')).toBe(true)
      expect(isEthereumAddressOrDomain('vitalik.eth')).toBe(true)
    })

    it('should reject invalid inputs', () => {
      expect(isEthereumAddressOrDomain('invalid')).toBe(false)
      expect(isEthereumAddressOrDomain('0x123')).toBe(false)
      expect(isEthereumAddressOrDomain('test.com')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://test.org')).toBe(true)
      expect(isValidUrl('https://www.example.com/path')).toBe(true)
      expect(isValidUrl('http://sub.domain.example.com')).toBe(true)
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl(null)).toBe(false)
      expect(isValidUrl(undefined)).toBe(false)
    })
  })

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('my-slug')).toBe(true)
      expect(isValidSlug('test_slug')).toBe(true)
      expect(isValidSlug('Slug123')).toBe(true)
      expect(isValidSlug('a-b_c-1')).toBe(true)
    })

    it('should reject invalid slugs', () => {
      expect(isValidSlug('my slug')).toBe(false)
      expect(isValidSlug('slug@test')).toBe(false)
      expect(isValidSlug('slug.test')).toBe(false)
      expect(isValidSlug('')).toBe(false)
      expect(isValidSlug('my/slug')).toBe(false)
    })
  })

  describe('isEmptyString', () => {
    it('should identify empty strings', () => {
      expect(isEmptyString('')).toBe(true)
      expect(isEmptyString('   ')).toBe(true)
      expect(isEmptyString('\t\n')).toBe(true)
    })

    it('should identify non-empty strings', () => {
      expect(isEmptyString('text')).toBe(false)
      expect(isEmptyString('  text  ')).toBe(false)
      expect(isEmptyString('0')).toBe(false)
    })

    it('should handle undefined and null', () => {
      expect(isEmptyString(undefined as any)).toBe(true)
      expect(isEmptyString(null as any)).toBe(true)
    })
  })
})
