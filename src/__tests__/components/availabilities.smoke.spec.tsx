/**
 * Smoke tests for availabilities components
 * 
 * These tests verify that components can be imported and have basic structure
 */

describe('availabilities components', () => {
  describe('imports', () => {
    it('should import AvailabilityConfig without crashing', () => {
      expect(() => require('@/components/availabilities/AvailabilityConfig')).not.toThrow()
    })

    it('should import AvailabilityBlockCard without crashing', () => {
      expect(() => require('@/components/availabilities/AvailabilityBlockCard')).not.toThrow()
    })

    it('should import AvailabilityModal without crashing', () => {
      expect(() => require('@/components/availabilities/AvailabilityModal')).not.toThrow()
    })

    it('should import AvailabilityEmptyState without crashing', () => {
      expect(() => require('@/components/availabilities/AvailabilityEmptyState')).not.toThrow()
    })

    it('should import TimeSelector without crashing', () => {
      expect(() => require('@/components/availabilities/TimeSelector')).not.toThrow()
    })

    it('should import WeekdayConfig without crashing', () => {
      expect(() => require('@/components/availabilities/WeekdayConfig')).not.toThrow()
    })
  })

  describe('component structure', () => {
    it('AvailabilityConfig should have exports', () => {
      const component = require('@/components/availabilities/AvailabilityConfig')
      expect(component).toBeDefined()
    })

    it('AvailabilityModal should have exports', () => {
      const component = require('@/components/availabilities/AvailabilityModal')
      expect(component).toBeDefined()
    })

    it('TimeSelector should have exports', () => {
      const component = require('@/components/availabilities/TimeSelector')
      expect(component).toBeDefined()
    })

    it('WeekdayConfig should have exports', () => {
      const component = require('@/components/availabilities/WeekdayConfig')
      expect(component).toBeDefined()
    })
  })
})
