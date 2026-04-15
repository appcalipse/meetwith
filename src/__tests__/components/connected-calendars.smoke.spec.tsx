/**
 * Smoke tests for ConnectedCalendars components
 *
 * These tests verify that components can be imported without crashing
 */

describe('ConnectedCalendars components', () => {
  describe('imports', () => {
    it('should import ConnectCalendarModal without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/ConnectCalendarModal')).not.toThrow()
    })

    it('should import ConnectedCalendarCard without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/ConnectedCalendarCard')).not.toThrow()
    })

    it('should import DisabledCalendarCard without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/DisabledCalendarCard')).not.toThrow()
    })

    it('should import DisconnectCalendarDialog without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/DisconnectCalendarDialog')).not.toThrow()
    })

    it('should import MultipleCalendarList without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/MultipleCalendarList')).not.toThrow()
    })

    it('should import WebCalDetail without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/WebCalDetail')).not.toThrow()
    })

    it('should import WebDavCalendarDetail without crashing', () => {
      expect(() => require('@/components/ConnectedCalendars/WebDavCalendarDetail')).not.toThrow()
    })
  })
})
