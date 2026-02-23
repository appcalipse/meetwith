jest.mock(
  '@/pages/api/secure/calendar_integrations/office365/connect',
  () => ({
    officeScopes: ['User.Read', 'Calendars.Read', 'offline_access'],
  })
)

import {
  RefreshTokenCredential,
  O365AuthCredentials,
} from '@/utils/services/office365.credential'

describe('RefreshTokenCredential', () => {
  const originalFetch = global.fetch
  const mockOnTokenRefresh = jest.fn().mockResolvedValue(undefined)

  // Token expiring in the far future (not expired)
  const validCredential: O365AuthCredentials = {
    access_token: 'valid-token',
    expiry_date: Math.round(Date.now() / 1000) + 3600, // 1 hour from now
    refresh_token: 'refresh-token',
  }

  // Token that is already expired
  const expiredCredential: O365AuthCredentials = {
    access_token: 'expired-token',
    expiry_date: Math.round(Date.now() / 1000) - 3600, // 1 hour ago
    refresh_token: 'refresh-token',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should return cached token when not expired', async () => {
    const credential = new RefreshTokenCredential(
      validCredential,
      'client-id',
      'client-secret',
      mockOnTokenRefresh
    )

    const result = await credential.getToken()

    expect(result.token).toBe('valid-token')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should refresh token when expired', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'new-token',
        expires_in: 3600,
      }),
    })

    const credential = new RefreshTokenCredential(
      expiredCredential,
      'client-id',
      'client-secret',
      mockOnTokenRefresh
    )

    const result = await credential.getToken()

    expect(result.token).toBe('new-token')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(mockOnTokenRefresh).toHaveBeenCalledWith(
      'new-token',
      expect.any(Number)
    )
  })

  it('should throw when refresh fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('invalid_grant'),
    })

    const credential = new RefreshTokenCredential(
      expiredCredential,
      'client-id',
      'client-secret',
      mockOnTokenRefresh
    )

    await expect(credential.getToken()).rejects.toThrow('Token refresh failed')
  })

  it('should throw when refresh returns invalid access_token', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: '',
        expires_in: 3600,
      }),
    })

    const credential = new RefreshTokenCredential(
      expiredCredential,
      'client-id',
      'client-secret',
      mockOnTokenRefresh
    )

    await expect(credential.getToken()).rejects.toThrow(
      'Token refresh response missing or invalid access_token'
    )
  })

  it('should deduplicate concurrent refresh calls', async () => {
    let resolveRefresh: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRefresh = resolve
        })
    )

    const credential = new RefreshTokenCredential(
      expiredCredential,
      'client-id',
      'client-secret',
      mockOnTokenRefresh
    )

    // Fire two concurrent getToken calls
    const p1 = credential.getToken()
    const p2 = credential.getToken()

    // Resolve the single fetch call
    resolveRefresh!({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'new-token',
        expires_in: 3600,
      }),
    })

    const [result1, result2] = await Promise.all([p1, p2])

    // Both should get the same token, with only one fetch call
    expect(result1.token).toBe('new-token')
    expect(result2.token).toBe('new-token')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
