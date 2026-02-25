describe('telegram.helper', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  // Dynamically import to pick up mocked fetch
  const loadModule = () => import('@/utils/services/telegram.helper')

  describe('sendDm', () => {
    it('should POST to the Telegram sendMessage API', async () => {
      const mockResponse = { ok: true, result: { message_id: 1 } }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      })

      const { sendDm } = await loadModule()
      const result = await sendDm('12345', 'Hello!')

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toContain('/sendMessage')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({
        chat_id: '12345',
        text: 'Hello!',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getTelegramUserInfo', () => {
    it('should return user info on success', async () => {
      const mockData = {
        ok: true,
        result: {
          id: 12345,
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
        },
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData),
      })

      const { getTelegramUserInfo } = await loadModule()
      const result = await getTelegramUserInfo('12345')

      expect(result).toEqual({
        id: 12345,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
      })
    })

    it('should return null when API responds with not ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({ ok: false }),
      })

      const { getTelegramUserInfo } = await loadModule()
      const result = await getTelegramUserInfo('12345')

      expect(result).toBeNull()
    })

    it('should return null on fetch error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { getTelegramUserInfo } = await loadModule()
      const result = await getTelegramUserInfo('12345')

      expect(result).toBeNull()
    })
  })
})
