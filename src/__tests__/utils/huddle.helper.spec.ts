import { addUTMParams, HUDDLE_API_URL, HUDDLE_BASE_URL, UTM_PARAMS } from '@/utils/huddle.helper'

describe('huddle.helper', () => {
  describe('Constants', () => {
    it('should have correct UTM_PARAMS value', () => {
      expect(UTM_PARAMS).toBe('&utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should have correct HUDDLE_BASE_URL', () => {
      expect(HUDDLE_BASE_URL).toBe('https://meetwithwallet.huddle01.com/')
    })

    it('should have correct HUDDLE_API_URL', () => {
      expect(HUDDLE_API_URL).toBe('https://api.huddle01.com/api')
    })
  })

  describe('addUTMParams', () => {
    it('should add UTM params to URL without query string', () => {
      const url = 'https://example.com/path'
      const result = addUTMParams(url)
      expect(result).toBe('https://example.com/path?utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should add UTM params to URL with existing query string', () => {
      const url = 'https://example.com/path?existing=param'
      const result = addUTMParams(url)
      expect(result).toBe('https://example.com/path?existing=param&utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should add UTM params to URL with multiple existing params', () => {
      const url = 'https://example.com/path?param1=value1&param2=value2'
      const result = addUTMParams(url)
      expect(result).toBe('https://example.com/path?param1=value1&param2=value2&utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should handle URL with hash', () => {
      const url = 'https://example.com/path#section'
      const result = addUTMParams(url)
      expect(result).toBe('https://example.com/path#section?utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should handle empty URL', () => {
      const url = ''
      const result = addUTMParams(url)
      expect(result).toBe('?utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })

    it('should handle URL with trailing slash', () => {
      const url = 'https://example.com/'
      const result = addUTMParams(url)
      expect(result).toBe('https://example.com/?utm_source=partner&utm_medium=calendar&utm_campaign=mww')
    })
  })
})
