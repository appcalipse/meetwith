import React from 'react'

jest.mock('@mdx-js/react', () => ({
  MDXProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('misc components', () => {
  describe('imports', () => {
    it('should import ConnectWalletDialog without crashing', () => {
      expect(() => require('@/components/ConnectWalletDialog')).not.toThrow()
    })

    it('should import CookieConsent without crashing', () => {
      expect(() => require('@/components/CookieConsent/index')).not.toThrow()
    })

    it('should import CustomError without crashing', () => {
      expect(() => require('@/components/CustomError')).not.toThrow()
    })

    it('should import EmptyState without crashing', () => {
      expect(() => require('@/components/EmptyState')).not.toThrow()
    })

    it('should import Footer without crashing', () => {
      expect(() => require('@/components/Footer')).not.toThrow()
    })

    it('should import mdx.provider without crashing', () => {
      expect(() => require('@/components/mdx.provider')).not.toThrow()
    })

    it('should import TimezoneSelector without crashing', () => {
      expect(() => require('@/components/TimezoneSelector')).not.toThrow()
    })

    it('should import toggle-selector without crashing', () => {
      expect(() => require('@/components/toggle-selector/index')).not.toThrow()
    })

    it('should import RedirectNotifier without crashing', () => {
      expect(() => require('@/components/redirect/RedirectNotifier')).not.toThrow()
    })

    it('should import redirect without crashing', () => {
      expect(() => require('@/components/redirect/index')).not.toThrow()
    })

    it('should import CreatableDurationSelect without crashing', () => {
      expect(() => require('@/components/custom-select/CreatableDurationSelect')).not.toThrow()
    })
  })
})
