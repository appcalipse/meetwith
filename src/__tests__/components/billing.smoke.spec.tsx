describe('billing components', () => {
  describe('imports', () => {
    it('should import CustomHandleSelectionModal without crashing', () => {
      expect(() => require('@/components/billing/CustomHandleSelectionModal')).not.toThrow()
    })

    it('should import SubscriptionCheckoutModal without crashing', () => {
      expect(() => require('@/components/billing/SubscriptionCheckoutModal')).not.toThrow()
    })
  })
})
