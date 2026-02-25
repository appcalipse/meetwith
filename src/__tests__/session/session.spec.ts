/**
 * Smoke tests for session modules
 *
 * These tests verify that session modules can be imported without crashing
 * and have the expected exports.
 */

describe('session modules', () => {
  describe('imports', () => {
    it('should import core without crashing', () => {
      expect(() => require('@/session/core')).not.toThrow()
    })

    it('should import forceAuthenticationCheck without crashing', () => {
      expect(() => require('@/session/forceAuthenticationCheck')).not.toThrow()
    })

    it('should import login without crashing', () => {
      expect(() => require('@/session/login')).not.toThrow()
    })

    it('should import requireAuthentication without crashing', () => {
      expect(() => require('@/session/requireAuthentication')).not.toThrow()
    })
  })

  describe('module exports', () => {
    it('core should export validateAuthentication', () => {
      const mod = require('@/session/core')
      expect(mod).toBeDefined()
      expect(mod.validateAuthentication).toBeDefined()
      expect(typeof mod.validateAuthentication).toBe('function')
    })

    it('core should export validateAuthenticationApp', () => {
      const mod = require('@/session/core')
      expect(mod.validateAuthenticationApp).toBeDefined()
      expect(typeof mod.validateAuthenticationApp).toBe('function')
    })

    it('forceAuthenticationCheck should export forceAuthenticationCheck', () => {
      const mod = require('@/session/forceAuthenticationCheck')
      expect(mod).toBeDefined()
      expect(mod.forceAuthenticationCheck).toBeDefined()
      expect(typeof mod.forceAuthenticationCheck).toBe('function')
    })

    it('login should export useLogin', () => {
      const mod = require('@/session/login')
      expect(mod).toBeDefined()
      expect(mod.useLogin).toBeDefined()
      expect(typeof mod.useLogin).toBe('function')
    })

    it('requireAuthentication should export withLoginRedirect', () => {
      const mod = require('@/session/requireAuthentication')
      expect(mod).toBeDefined()
      expect(mod.withLoginRedirect).toBeDefined()
      expect(typeof mod.withLoginRedirect).toBe('function')
    })

    it('requireAuthentication should export withDashboardRedirect', () => {
      const mod = require('@/session/requireAuthentication')
      expect(mod.withDashboardRedirect).toBeDefined()
      expect(typeof mod.withDashboardRedirect).toBe('function')
    })
  })
})
