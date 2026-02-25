import Router from 'next/router'

import redirectTo from '@/utils/redirect'

// Mock Next.js Router
jest.mock('next/router', () => ({
  replace: jest.fn(),
}))

describe('redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('client-side redirect', () => {
    it('should use Router.replace for client-side navigation', () => {
      const ctx = { res: undefined } as any
      const path = '/dashboard'
      const httpCode = 302

      const result = redirectTo(path, httpCode, ctx)

      expect(Router.replace).toHaveBeenCalledWith(path)
      expect(result).toEqual({})
    })

    it('should handle different paths', () => {
      const ctx = { res: undefined } as any

      redirectTo('/home', 302, ctx)
      expect(Router.replace).toHaveBeenCalledWith('/home')

      redirectTo('/profile/settings', 302, ctx)
      expect(Router.replace).toHaveBeenCalledWith('/profile/settings')
    })

    it('should return empty object', () => {
      const ctx = { res: undefined } as any
      const result = redirectTo('/test', 302, ctx)

      expect(result).toEqual({})
    })
  })

  describe('server-side redirect', () => {
    it('should use writeHead and end for server-side navigation', () => {
      const writeHead = jest.fn()
      const end = jest.fn()
      const ctx = {
        res: {
          writeHead,
          end,
        },
      } as any

      const path = '/login'
      const httpCode = 301

      const result = redirectTo(path, httpCode, ctx)

      expect(writeHead).toHaveBeenCalledWith(httpCode, { Location: path })
      expect(end).toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('should handle different HTTP codes', () => {
      const writeHead = jest.fn()
      const end = jest.fn()
      const ctx = {
        res: { writeHead, end },
      } as any

      redirectTo('/redirect', 301, ctx)
      expect(writeHead).toHaveBeenCalledWith(301, { Location: '/redirect' })

      redirectTo('/temp-redirect', 302, ctx)
      expect(writeHead).toHaveBeenCalledWith(302, {
        Location: '/temp-redirect',
      })

      redirectTo('/not-found', 404, ctx)
      expect(writeHead).toHaveBeenCalledWith(404, { Location: '/not-found' })
    })

    it('should not call Router.replace on server-side', () => {
      const writeHead = jest.fn()
      const end = jest.fn()
      const ctx = {
        res: { writeHead, end },
      } as any

      redirectTo('/server', 302, ctx)

      expect(Router.replace).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty path', () => {
      const ctx = { res: undefined } as any
      redirectTo('', 302, ctx)

      expect(Router.replace).toHaveBeenCalledWith('')
    })

    it('should handle path with query parameters', () => {
      const ctx = { res: undefined } as any
      redirectTo('/page?param=value', 302, ctx)

      expect(Router.replace).toHaveBeenCalledWith('/page?param=value')
    })

    it('should handle absolute URLs', () => {
      const ctx = { res: undefined } as any
      redirectTo('https://example.com', 302, ctx)

      expect(Router.replace).toHaveBeenCalledWith('https://example.com')
    })
  })
})
