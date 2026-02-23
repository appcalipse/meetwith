/**
 * Smoke tests for input-pickers components
 *
 * These tests verify that components can be imported without crashing
 */

describe('input-date-picker components', () => {
  describe('imports', () => {
    it('should import calendarPanel without crashing', () => {
      expect(() => require('@/components/input-date-picker/components/calendarPanel')).not.toThrow()
    })

    it('should import dateNavBtns without crashing', () => {
      expect(() => require('@/components/input-date-picker/components/dateNavBtns')).not.toThrow()
    })

    it('should import dayOfMonth without crashing', () => {
      expect(() => require('@/components/input-date-picker/components/dayOfMonth')).not.toThrow()
    })

    it('should import input-date-picker index without crashing', () => {
      expect(() => require('@/components/input-date-picker')).not.toThrow()
    })

    it('should import range without crashing', () => {
      expect(() => require('@/components/input-date-picker/range')).not.toThrow()
    })

    it('should import single without crashing', () => {
      expect(() => require('@/components/input-date-picker/single')).not.toThrow()
    })
  })
})

describe('input-time-picker components', () => {
  describe('imports', () => {
    it('should import input-time-picker index without crashing', () => {
      expect(() => require('@/components/input-time-picker')).not.toThrow()
    })
  })
})

describe('MeetSlotPicker components', () => {
  describe('imports', () => {
    it('should import TimeSlots without crashing', () => {
      expect(() => require('@/components/MeetSlotPicker/TimeSlots')).not.toThrow()
    })

    it('should import StandAloneMonthDays without crashing', () => {
      expect(() => require('@/components/MeetSlotPicker/calendar/StandAloneMonthDays')).not.toThrow()
    })
  })
})
