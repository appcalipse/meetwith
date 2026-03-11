/**
 * Smoke tests for Loading components
 *
 * These tests verify that components can be imported without crashing
 */

describe('Loading components', () => {
  describe('imports', () => {
    it('should import LogoModalLoading without crashing', () => {
      expect(() => require('@/components/Loading/LogoModalLoading')).not.toThrow()
    })

    it('should import ModalLoading without crashing', () => {
      expect(() => require('@/components/Loading/ModalLoading')).not.toThrow()
    })

    it('should import Loading index without crashing', () => {
      expect(() => require('@/components/Loading')).not.toThrow()
    })
  })
})
