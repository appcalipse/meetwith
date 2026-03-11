describe('meeting components', () => {
  describe('imports', () => {
    it('should import Base without crashing', () => {
      expect(() => require('@/components/meeting/Base')).not.toThrow()
    })

    it('should import MeetingCard without crashing', () => {
      expect(() => require('@/components/meeting/MeetingCard/index')).not.toThrow()
    })

    it('should import MeetingScheduledDialog without crashing', () => {
      expect(() => require('@/components/meeting/MeetingScheduledDialog')).not.toThrow()
    })
  })
})
