describe('notifications components', () => {
  describe('imports', () => {
    it('should import DiscordNotificationConfig without crashing', () => {
      expect(() => require('@/components/notifications/DiscordNotificationConfig')).not.toThrow()
    })

    it('should import NotificationConfig without crashing', () => {
      expect(() => require('@/components/notifications/NotificationConfig')).not.toThrow()
    })

    it('should import TelegramNotificationConfig without crashing', () => {
      expect(() => require('@/components/notifications/TelegramNotificationConfig')).not.toThrow()
    })
  })
})
