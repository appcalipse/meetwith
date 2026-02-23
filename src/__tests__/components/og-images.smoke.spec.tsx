/**
 * Smoke tests for og-images components
 *
 * These tests verify that components can be imported without crashing
 */

describe('og-images components', () => {
  describe('imports', () => {
    it('should import Banner without crashing', () => {
      expect(() => require('@/components/og-images/Banner')).not.toThrow()
    })

    it('should import BannerBrowser without crashing', () => {
      expect(() => require('@/components/og-images/BannerBrowser')).not.toThrow()
    })

    it('should import jazzicon colors without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon/colors')).not.toThrow()
    })

    it('should import jazzicon index without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon')).not.toThrow()
    })

    it('should import jazzicon component without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon/jazzicon.component')).not.toThrow()
    })

    it('should import paper component without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon/paper.component')).not.toThrow()
    })

    it('should import shape component without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon/shape.component')).not.toThrow()
    })

    it('should import svg.ns without crashing', () => {
      expect(() => require('@/components/og-images/jazzicon/svg.ns')).not.toThrow()
    })
  })
})
