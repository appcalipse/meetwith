describe('wallet components', () => {
  describe('imports', () => {
    it('should import WithdrawFundsModal without crashing', () => {
      expect(() => require('@/components/wallet/WithdrawFundsModal')).not.toThrow()
    })
  })
})
