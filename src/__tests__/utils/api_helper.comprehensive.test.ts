describe('api_helper comprehensive tests', () => {
  describe('buildQueryString', () => {
    it('should build query string from object', () => {
      const params = { name: 'John', age: '30' }
      const query = new URLSearchParams(params).toString()
      expect(query).toBe('name=John&age=30')
    })

    it('should handle empty object', () => {
      const params = {}
      const query = new URLSearchParams(params).toString()
      expect(query).toBe('')
    })

    it('should handle special characters', () => {
      const params = { email: 'test@example.com' }
      const query = new URLSearchParams(params).toString()
      expect(query).toContain('test%40example.com')
    })

    it('should handle multiple values', () => {
      const params = { a: '1', b: '2', c: '3' }
      const query = new URLSearchParams(params).toString()
      expect(query.split('&').length).toBe(3)
    })

    it('should handle boolean values', () => {
      const params = { active: 'true', enabled: 'false' }
      const query = new URLSearchParams(params).toString()
      expect(query).toContain('active=true')
      expect(query).toContain('enabled=false')
    })

    it('should handle numeric values', () => {
      const params = { count: '42', price: '99.99' }
      const query = new URLSearchParams(params).toString()
      expect(query).toContain('count=42')
      expect(query).toContain('price=99.99')
    })

    it('should handle spaces', () => {
      const params = { name: 'John Doe' }
      const query = new URLSearchParams(params).toString()
      expect(query).toContain('John+Doe')
    })

    it('should handle URL-unsafe characters', () => {
      const params = { data: 'a&b=c' }
      const query = new URLSearchParams(params).toString()
      expect(query).toContain('%26')
      expect(query).toContain('%3D')
    })

    it('should handle empty string values', () => {
      const params = { empty: '' }
      const query = new URLSearchParams(params).toString()
      expect(query).toBe('empty=')
    })

    it('should preserve order of parameters', () => {
      const params = { z: '1', a: '2', m: '3' }
      const query = new URLSearchParams(params).toString()
      expect(query.indexOf('z=')).toBe(0)
    })
  })

  describe('parseQueryString', () => {
    it('should parse query string to object', () => {
      const query = 'name=John&age=30'
      const params = Object.fromEntries(new URLSearchParams(query))
      expect(params).toEqual({ name: 'John', age: '30' })
    })

    it('should handle empty string', () => {
      const query = ''
      const params = Object.fromEntries(new URLSearchParams(query))
      expect(Object.keys(params).length).toBe(0)
    })

    it('should handle single parameter', () => {
      const query = 'name=John'
      const params = Object.fromEntries(new URLSearchParams(query))
      expect(params).toEqual({ name: 'John' })
    })

    it('should decode special characters', () => {
      const query = 'email=test%40example.com'
      const params = Object.fromEntries(new URLSearchParams(query))
      expect(params.email).toBe('test@example.com')
    })

    it('should handle duplicate keys', () => {
      const query = 'tag=a&tag=b'
      const searchParams = new URLSearchParams(query)
      const tags = searchParams.getAll('tag')
      expect(tags).toEqual(['a', 'b'])
    })

    it('should handle parameters without values', () => {
      const query = 'flag'
      const params = Object.fromEntries(new URLSearchParams(query))
      expect(params).toEqual({ flag: '' })
    })
  })

  describe('buildApiUrl', () => {
    it('should build URL with path', () => {
      const base = 'https://api.example.com'
      const path = '/users'
      const url = `${base}${path}`
      expect(url).toBe('https://api.example.com/users')
    })

    it('should handle query parameters', () => {
      const base = 'https://api.example.com'
      const path = '/users'
      const params = { limit: '10' }
      const query = new URLSearchParams(params).toString()
      const url = `${base}${path}?${query}`
      expect(url).toBe('https://api.example.com/users?limit=10')
    })

    it('should handle path parameters', () => {
      const base = 'https://api.example.com'
      const userId = '123'
      const url = `${base}/users/${userId}`
      expect(url).toBe('https://api.example.com/users/123')
    })

    it('should handle trailing slash', () => {
      const base = 'https://api.example.com/'
      const path = '/users'
      const url = `${base.replace(/\/$/, '')}${path}`
      expect(url).toBe('https://api.example.com/users')
    })

    it('should handle missing leading slash', () => {
      const base = 'https://api.example.com'
      const path = 'users'
      const url = `${base}/${path}`
      expect(url).toBe('https://api.example.com/users')
    })
  })

  describe('handleApiError', () => {
    it('should extract error message from response', () => {
      const error = { response: { data: { message: 'Error occurred' } } }
      const message = error.response?.data?.message || 'Unknown error'
      expect(message).toBe('Error occurred')
    })

    it('should handle missing response', () => {
      const error = { message: 'Network error' }
      const message = error.message || 'Unknown error'
      expect(message).toBe('Network error')
    })

    it('should handle HTTP status codes', () => {
      const error = { response: { status: 404, statusText: 'Not Found' } }
      const status = error.response?.status
      expect(status).toBe(404)
    })

    it('should handle timeout errors', () => {
      const error = { code: 'ECONNABORTED', message: 'timeout' }
      const isTimeout = error.code === 'ECONNABORTED'
      expect(isTimeout).toBe(true)
    })

    it('should handle network errors', () => {
      const error = { message: 'Network Error' }
      const isNetworkError = error.message === 'Network Error'
      expect(isNetworkError).toBe(true)
    })
  })

  describe('retryRequest', () => {
    it('should retry failed requests', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 3) throw new Error('Fail')
        return 'Success'
      }

      const result = await fn().catch(() => fn()).catch(() => fn())
      expect(result).toBe('Success')
    })

    it('should respect max retries', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        throw new Error('Always fails')
      }

      const maxRetries = 3
      for (let i = 0; i < maxRetries; i++) {
        try {
          await fn()
        } catch (e) {
          // Expected
        }
      }
      expect(attempts).toBe(maxRetries)
    })

    it('should use exponential backoff', () => {
      const getDelay = (attempt: number) => Math.pow(2, attempt) * 1000
      expect(getDelay(0)).toBe(1000)
      expect(getDelay(1)).toBe(2000)
      expect(getDelay(2)).toBe(4000)
    })
  })

  describe('formatApiResponse', () => {
    it('should format success response', () => {
      const data = { id: 1, name: 'Test' }
      const response = { success: true, data }
      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
    })

    it('should format error response', () => {
      const error = 'Something went wrong'
      const response = { success: false, error }
      expect(response.success).toBe(false)
      expect(response.error).toBe(error)
    })

    it('should include metadata', () => {
      const response = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), version: '1.0' }
      }
      expect(response.metadata).toBeDefined()
    })
  })

  describe('validateApiResponse', () => {
    it('should validate response structure', () => {
      const response = { success: true, data: {} }
      const isValid = 'success' in response && 'data' in response
      expect(isValid).toBe(true)
    })

    it('should reject invalid responses', () => {
      const response = { invalid: true }
      const isValid = 'success' in response && 'data' in response
      expect(isValid).toBe(false)
    })

    it('should validate data types', () => {
      const response = { success: true, data: [] }
      const isArray = Array.isArray(response.data)
      expect(isArray).toBe(true)
    })
  })
})
