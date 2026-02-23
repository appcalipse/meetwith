describe('nav components', () => {
  describe('imports', () => {
    it('should import ConnectModal without crashing', () => {
      expect(() => require('@/components/nav/ConnectModal')).not.toThrow()
    })

    it('should import Navbar without crashing', () => {
      expect(() => require('@/components/nav/Navbar')).not.toThrow()
    })
  })
})
