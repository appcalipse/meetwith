/**
 * Smoke tests for icons components
 *
 * These tests verify that components can be imported without crashing
 */

describe('icons components', () => {
  describe('imports', () => {
    it('should import Availability without crashing', () => {
      expect(() => require('@/components/icons/Availability')).not.toThrow()
    })

    it('should import ChainLogo without crashing', () => {
      expect(() => require('@/components/icons/ChainLogo')).not.toThrow()
    })

    it('should import FiatLogo without crashing', () => {
      expect(() => require('@/components/icons/FiatLogo')).not.toThrow()
    })

    it('should import Grid4 without crashing', () => {
      expect(() => require('@/components/icons/Grid4')).not.toThrow()
    })

    it('should import Image without crashing', () => {
      expect(() => require('@/components/icons/Image')).not.toThrow()
    })

    it('should import InvoiceIcon without crashing', () => {
      expect(() => require('@/components/icons/InvoiceIcon')).not.toThrow()
    })
  })
})
