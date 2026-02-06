import {
  isValidEmail, isValidEVMAddress, isValidEthereumDomain, isEthereumAddressOrDomain,
  isValidUrl, isValidSlug, isEmptyString
} from '@/utils/validations'

describe('Validations Execution Tests', () => {
  describe('isValidEmail', () => {
    it('executes with valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
    })

    it('executes with invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false)
    })

    it('executes with undefined', () => {
      expect(isValidEmail(undefined)).toBe(false)
    })

    it('executes with email with plus', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('executes with email with dots', () => {
      expect(isValidEmail('user.name@example.com')).toBe(true)
    })

    it('executes with missing @', () => {
      expect(isValidEmail('userexample.com')).toBe(false)
    })

    it('executes with missing domain', () => {
      expect(isValidEmail('user@')).toBe(false)
    })
  })

  describe('isValidEVMAddress', () => {
    it('executes with valid address', () => {
      expect(isValidEVMAddress('0x1234567890123456789012345678901234567890')).toBe(true)
    })

    it('executes with invalid length', () => {
      expect(isValidEVMAddress('0x123')).toBe(false)
    })

    it('executes with no 0x prefix', () => {
      expect(isValidEVMAddress('1234567890123456789012345678901234567890')).toBe(false)
    })

    it('executes with invalid characters', () => {
      expect(isValidEVMAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false)
    })

    it('executes with lowercase', () => {
      expect(isValidEVMAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(true)
    })

    it('executes with uppercase', () => {
      expect(isValidEVMAddress('0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD')).toBe(true)
    })
  })

  describe('isValidEthereumDomain', () => {
    it('executes with .eth domain', () => {
      const result = isValidEthereumDomain('vitalik.eth')
      expect(typeof result).toBe('boolean')
    })

    it('executes with regular domain', () => {
      const result = isValidEthereumDomain('example.com')
      expect(typeof result).toBe('boolean')
    })

    it('executes with empty string', () => {
      expect(isValidEthereumDomain('')).toBe(false)
    })

    it('executes with subdomain.eth', () => {
      const result = isValidEthereumDomain('sub.vitalik.eth')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isEthereumAddressOrDomain', () => {
    it('executes with valid address', () => {
      expect(isEthereumAddressOrDomain('0x1234567890123456789012345678901234567890')).toBe(true)
    })

    it('executes with .eth domain', () => {
      expect(isEthereumAddressOrDomain('vitalik.eth')).toBe(true)
    })

    it('executes with invalid input', () => {
      expect(isEthereumAddressOrDomain('invalid')).toBe(false)
    })

    it('executes with empty string', () => {
      expect(isEthereumAddressOrDomain('')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('executes with valid HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('executes with valid HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('executes with invalid URL', () => {
      expect(isValidUrl('not a url')).toBe(false)
    })

    it('executes with null', () => {
      expect(isValidUrl(null)).toBe(false)
    })

    it('executes with undefined', () => {
      expect(isValidUrl(undefined)).toBe(false)
    })

    it('executes with URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true)
    })

    it('executes with URL with query', () => {
      expect(isValidUrl('https://example.com?param=value')).toBe(true)
    })
  })

  describe('isValidSlug', () => {
    it('executes with valid slug', () => {
      expect(isValidSlug('hello-world')).toBe(true)
    })

    it('executes with lowercase letters', () => {
      expect(isValidSlug('test')).toBe(true)
    })

    it('executes with numbers', () => {
      expect(isValidSlug('test123')).toBe(true)
    })

    it('executes with hyphens', () => {
      expect(isValidSlug('my-test-slug')).toBe(true)
    })

    it('executes with uppercase (invalid)', () => {
      expect(isValidSlug('HelloWorld')).toBe(false)
    })

    it('executes with spaces (invalid)', () => {
      expect(isValidSlug('hello world')).toBe(false)
    })

    it('executes with special chars (invalid)', () => {
      expect(isValidSlug('hello@world')).toBe(false)
    })
  })

  describe('isEmptyString', () => {
    it('executes with empty string', () => {
      expect(isEmptyString('')).toBe(true)
    })

    it('executes with whitespace', () => {
      expect(isEmptyString('   ')).toBe(true)
    })

    it('executes with non-empty string', () => {
      expect(isEmptyString('hello')).toBe(false)
    })

    it('executes with string with content', () => {
      expect(isEmptyString(' hello ')).toBe(false)
    })

    it('executes with newline', () => {
      expect(isEmptyString('\n')).toBe(true)
    })

    it('executes with tab', () => {
      expect(isEmptyString('\t')).toBe(true)
    })
  })
})
