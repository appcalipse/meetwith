describe('poap.helper', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  const loadModule = () => import('@/utils/services/poap.helper')

  describe('generatePOAPAuthToken', () => {
    it('should return an auth token on success', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          access_token: 'test-token',
          token_type: 'Bearer',
        }),
      })

      const { generatePOAPAuthToken } = await loadModule()
      const result = await generatePOAPAuthToken()

      expect(result).not.toBeNull()
      expect(result?.access_token).toBe('test-token')
      expect(result?.created_at).toEqual(expect.any(Number))
    })

    it('should return null when OAuth returns an error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({ error: 'unauthorized' }),
      })

      const { generatePOAPAuthToken } = await loadModule()
      const result = await generatePOAPAuthToken()

      expect(result).toBeNull()
    })

    it('should return null on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network failure')
      )

      const { generatePOAPAuthToken } = await loadModule()
      const result = await generatePOAPAuthToken()

      expect(result).toBeNull()
    })
  })

  describe('fetchWalletPOAPs', () => {
    it('should return POAPs for a wallet', async () => {
      const mockPOAPs = [
        { tokenId: '1', event: { id: 100 }, owner: '0xABC' },
      ]
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockPOAPs),
      })

      const { fetchWalletPOAPs } = await loadModule()
      const result = await fetchWalletPOAPs('0xABC')

      expect(result).toEqual(mockPOAPs)
      const [url] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toContain('/actions/scan/0xABC')
    })

    it('should return empty array on non-2xx response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      })

      const { fetchWalletPOAPs } = await loadModule()
      const result = await fetchWalletPOAPs('0xABC')

      expect(result).toEqual([])
    })
  })

  describe('checkWalletHoldsPOAP', () => {
    it('should return POAP when wallet holds it', async () => {
      const mockPOAP = { tokenId: '1', event: { id: 42 } }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockPOAP),
      })

      const { checkWalletHoldsPOAP } = await loadModule()
      const result = await checkWalletHoldsPOAP('0xABC', 42)

      expect(result).toEqual(mockPOAP)
    })

    it('should return null when wallet does not hold POAP (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 404,
        json: jest.fn().mockResolvedValue(null),
      })

      const { checkWalletHoldsPOAP } = await loadModule()
      const result = await checkWalletHoldsPOAP('0xABC', 42)

      expect(result).toBeNull()
    })

    it('should return null on server error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 500,
        json: jest.fn().mockResolvedValue(null),
      })

      const { checkWalletHoldsPOAP } = await loadModule()
      const result = await checkWalletHoldsPOAP('0xABC', 42)

      expect(result).toBeNull()
    })
  })

  describe('getPOAPEventDetails', () => {
    it('should return event details on success', async () => {
      const mockEvent = { id: 42, name: 'Test Event' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockEvent),
      })

      const { getPOAPEventDetails } = await loadModule()
      const result = await getPOAPEventDetails(42)

      expect(result).toEqual(mockEvent)
      const [url] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toContain('/events/id/42')
    })

    it('should return null on error response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 400,
        json: jest.fn().mockResolvedValue(null),
      })

      const { getPOAPEventDetails } = await loadModule()
      const result = await getPOAPEventDetails(42)

      expect(result).toBeNull()
    })
  })
})
