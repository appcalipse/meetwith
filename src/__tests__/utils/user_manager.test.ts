import { ellipsizeAddress } from '@/utils/user_manager'

describe('user_manager', () => {
  describe('ellipsizeAddress', () => {
    it('ellipsizes long addresses', () => {
      const address = '0x1234567890123456789012345678901234567890'
      const result = ellipsizeAddress(address)
      expect(result).toContain('...')
    })

    it('keeps short addresses unchanged', () => {
      const address = '0x123'
      const result = ellipsizeAddress(address)
      expect(result).toBe(address)
    })

    it('handles null address', () => {
      const result = ellipsizeAddress(null as any)
      expect(result).toBeDefined()
    })

    it('handles undefined address', () => {
      const result = ellipsizeAddress(undefined as any)
      expect(result).toBeDefined()
    })

    it('handles empty string', () => {
      const result = ellipsizeAddress('')
      expect(result).toBe('')
    })

    it('shows correct prefix and suffix', () => {
      const address = '0x1234567890123456789012345678901234567890'
      const result = ellipsizeAddress(address)
      expect(result).toMatch(/^0x.*\.\.\..*$/)
    })

    it('handles custom length', () => {
      const address = '0x1234567890123456789012345678901234567890'
      const result = ellipsizeAddress(address, 6)
      expect(result.length).toBeLessThan(address.length)
    })
  })
})
