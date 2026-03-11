describe('contact components', () => {
  describe('imports', () => {
    it('should import ContactAcceptInviteModal without crashing', () => {
      expect(() => require('@/components/contact/ContactAcceptInviteModal')).not.toThrow()
    })

    it('should import ContactListItem without crashing', () => {
      expect(() => require('@/components/contact/ContactListItem')).not.toThrow()
    })

    it('should import ContactRejectInviteModal without crashing', () => {
      expect(() => require('@/components/contact/ContactRejectInviteModal')).not.toThrow()
    })

    it('should import ContactRequestItem without crashing', () => {
      expect(() => require('@/components/contact/ContactRequestItem')).not.toThrow()
    })

    it('should import ContactRequests without crashing', () => {
      expect(() => require('@/components/contact/ContactRequests')).not.toThrow()
    })

    it('should import ContactSearchItem without crashing', () => {
      expect(() => require('@/components/contact/ContactSearchItem')).not.toThrow()
    })

    it('should import ContactSearchModal without crashing', () => {
      expect(() => require('@/components/contact/ContactSearchModal')).not.toThrow()
    })

    it('should import ContactsList without crashing', () => {
      expect(() => require('@/components/contact/ContactsList')).not.toThrow()
    })

    it('should import GroupContactModal without crashing', () => {
      expect(() => require('@/components/contact/GroupContactModal')).not.toThrow()
    })

    it('should import GroupContactModalItem without crashing', () => {
      expect(() => require('@/components/contact/GroupContactModalItem')).not.toThrow()
    })
  })
})
