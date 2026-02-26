describe('connected-account components', () => {
  describe('imports', () => {
    it('should import SelectCountry without crashing', () => {
      expect(() => require('@/components/connected-account/SelectCountry')).not.toThrow()
    })

    it('should import AccountCard without crashing', () => {
      expect(() => require('@/components/connected-account/AccountCard')).not.toThrow()
    })
  })
})
