import {
  isValidEmail,
  isValidEVMAddress,
  isValidEthereumDomain,
  isEthereumAddressOrDomain,
  isValidUrl,
  isValidSlug,
  isEmptyString,
} from '@/utils/validations'

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'test123@test-domain.com',
        'a@b.co',
        'test@subdomain.example.com',
        'user_name@example.com',
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid@.com',
        'invalid@domain',
        'invalid @domain.com',
        'invalid@domain .com',
        '',
        'test@',
        '@test.com',
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })

    it('should return false for undefined or null', () => {
      expect(isValidEmail(undefined)).toBe(false)
      expect(isValidEmail(null as any)).toBe(false)
    })

    it('should handle case insensitivity', () => {
      expect(isValidEmail('Test@Example.COM')).toBe(true)
      expect(isValidEmail('USER@DOMAIN.COM')).toBe(true)
    })
  })

  describe('isValidEVMAddress', () => {
    it('should return true for valid EVM addresses', () => {
      const validAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
        '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        '0xabcdef1234567890abcdef1234567890abcdef12',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      ]

      validAddresses.forEach(address => {
        expect(isValidEVMAddress(address)).toBe(true)
      })
    })

    it('should return false for invalid EVM addresses', () => {
      const invalidAddresses = [
        '0x123', // Too short
        '0x12345678901234567890123456789012345678901', // Too long
        '1234567890123456789012345678901234567890', // Missing 0x prefix
        '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid characters
        '0x', // Just prefix
        '', // Empty
        '0x 1234567890123456789012345678901234567890', // Space
      ]

      invalidAddresses.forEach(address => {
        expect(isValidEVMAddress(address)).toBe(false)
      })
    })
  })

  describe('isValidEthereumDomain', () => {
    it('should return true for valid .eth domains', () => {
      const validDomains = [
        'vitalik.eth',
        'test.eth',
        'my-domain.eth',
        'test123.eth',
      ]

      validDomains.forEach(domain => {
        expect(isValidEthereumDomain(domain)).toBe(true)
      })
    })

    it('should return false for invalid ethereum domains', () => {
      const invalidDomains = [
        'vitalik.com',
        'test',
        'test.ens',
        'test.xyz',
        '',
      ]

      invalidDomains.forEach(domain => {
        expect(isValidEthereumDomain(domain)).toBe(false)
      })
    })

    it('should return true for .eth string', () => {
      // The regex just checks for .eth anywhere in the string
      expect(isValidEthereumDomain('.eth')).toBe(true)
    })
  })

  describe('isEthereumAddressOrDomain', () => {
    it('should return true for valid EVM addresses', () => {
      expect(
        isEthereumAddressOrDomain(
          '0x1234567890123456789012345678901234567890'
        )
      ).toBe(true)
    })

    it('should return true for valid ethereum domains', () => {
      expect(isEthereumAddressOrDomain('vitalik.eth')).toBe(true)
    })

    it('should return false for invalid addresses and domains', () => {
      expect(isEthereumAddressOrDomain('invalid')).toBe(false)
      expect(isEthereumAddressOrDomain('test.com')).toBe(false)
      expect(isEthereumAddressOrDomain('0x123')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com',
        'http://example.com/path',
        'https://example.com/path?query=value',
        'https://subdomain.example.com',
        'https://example.co.uk',
        'https://example.com:8080',
        'https://example.com/path#anchor',
        'https://example.com/path?key=value&another=test',
      ]

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return false for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com', // Missing protocol
        'ftp://example.com', // Not http(s)
        'http://',
        'https://',
        '',
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })

    it('should return false for undefined or null', () => {
      expect(isValidUrl(undefined)).toBe(false)
      expect(isValidUrl(null)).toBe(false)
    })
  })

  describe('isValidSlug', () => {
    it('should return true for valid slugs', () => {
      const validSlugs = [
        'valid-slug',
        'valid_slug',
        'ValidSlug',
        'slug123',
        'SLUG',
        'a',
        'A-B_C-1',
      ]

      validSlugs.forEach(slug => {
        expect(isValidSlug(slug)).toBe(true)
      })
    })

    it('should return false for invalid slugs', () => {
      const invalidSlugs = [
        'invalid slug', // Space
        'invalid-slug!', // Special character
        'invalid@slug', // Special character
        'invalid.slug', // Period
        'invalid/slug', // Slash
        '',
        'invalid slug with spaces',
      ]

      invalidSlugs.forEach(slug => {
        expect(isValidSlug(slug)).toBe(false)
      })
    })
  })

  describe('isEmptyString', () => {
    it('should return true for empty strings', () => {
      expect(isEmptyString('')).toBe(true)
      expect(isEmptyString('   ')).toBe(true)
      expect(isEmptyString('\t')).toBe(true)
      expect(isEmptyString('\n')).toBe(true)
      expect(isEmptyString('  \t  \n  ')).toBe(true)
    })

    it('should return true for undefined or null', () => {
      expect(isEmptyString(undefined as any)).toBe(true)
      expect(isEmptyString(null as any)).toBe(true)
    })

    it('should return false for non-empty strings', () => {
      expect(isEmptyString('a')).toBe(false)
      expect(isEmptyString('test')).toBe(false)
      expect(isEmptyString(' test ')).toBe(false)
      expect(isEmptyString('0')).toBe(false)
    })
  })
})
