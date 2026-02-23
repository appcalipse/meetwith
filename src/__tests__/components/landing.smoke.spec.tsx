describe('landing components', () => {
  describe('imports', () => {
    it('should import AlertMeDialog without crashing', () => {
      expect(() => require('@/components/landing/AlertMeDialog')).not.toThrow()
    })

    it('should import FAQ without crashing', () => {
      expect(() => require('@/components/landing/FAQ')).not.toThrow()
    })

    it('should import Features without crashing', () => {
      expect(() => require('@/components/landing/Features')).not.toThrow()
    })

    it('should import Hero without crashing', () => {
      expect(() => require('@/components/landing/Hero')).not.toThrow()
    })

    it('should import Plans without crashing', () => {
      expect(() => require('@/components/landing/Plans')).not.toThrow()
    })

    it('should import Pricing without crashing', () => {
      expect(() => require('@/components/landing/Pricing')).not.toThrow()
    })

    it('should import ProAccessPopUp without crashing', () => {
      expect(() => require('@/components/landing/ProAccessPopUp')).not.toThrow()
    })

    it('should import Why without crashing', () => {
      expect(() => require('@/components/landing/Why')).not.toThrow()
    })
  })
})
