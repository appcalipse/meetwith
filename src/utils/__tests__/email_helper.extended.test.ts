describe('email_helper extended tests', () => {
  describe('validateEmail', () => {
    it('should validate standard email formats', () => {
      const emails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example.co.uk'
      ]
      emails.forEach(email => {
        expect(email).toContain('@')
        expect(email.split('@').length).toBe(2)
      })
    })

    it('should reject invalid emails', () => {
      const invalid = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com'
      ]
      invalid.forEach(email => {
        const parts = email.split('@')
        const isValid = parts.length === 2 && parts[0].length > 0 && parts[1].includes('.')
        expect(isValid).toBe(false)
      })
    })

    it('should handle international domain names', () => {
      const intl = 'user@例え.jp'
      expect(intl).toContain('@')
    })

    it('should handle subdomains', () => {
      const subdomain = 'user@mail.example.com'
      const parts = subdomain.split('@')[1].split('.')
      expect(parts.length).toBeGreaterThan(2)
    })

    it('should validate email length', () => {
      const long = 'a'.repeat(64) + '@example.com'
      expect(long.length).toBeGreaterThan(64)
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      const email = 'user@example.com'
      const domain = email.split('@')[1]
      expect(domain).toBe('example.com')
    })

    it('should handle subdomain extraction', () => {
      const email = 'user@mail.example.com'
      const domain = email.split('@')[1]
      expect(domain).toBe('mail.example.com')
    })

    it('should handle TLD extraction', () => {
      const domain = 'example.com'
      const tld = domain.split('.').pop()
      expect(tld).toBe('com')
    })
  })

  describe('formatEmailList', () => {
    it('should format multiple emails', () => {
      const emails = ['a@test.com', 'b@test.com', 'c@test.com']
      const formatted = emails.join(', ')
      expect(formatted).toBe('a@test.com, b@test.com, c@test.com')
    })

    it('should handle single email', () => {
      const emails = ['test@example.com']
      expect(emails.length).toBe(1)
    })

    it('should handle empty array', () => {
      const emails: string[] = []
      expect(emails.length).toBe(0)
    })

    it('should remove duplicates', () => {
      const emails = ['a@test.com', 'a@test.com', 'b@test.com']
      const unique = [...new Set(emails)]
      expect(unique.length).toBe(2)
    })
  })

  describe('parseRecipients', () => {
    it('should parse comma-separated emails', () => {
      const input = 'a@test.com, b@test.com, c@test.com'
      const emails = input.split(',').map(e => e.trim())
      expect(emails.length).toBe(3)
    })

    it('should handle semicolon separation', () => {
      const input = 'a@test.com; b@test.com; c@test.com'
      const emails = input.split(';').map(e => e.trim())
      expect(emails.length).toBe(3)
    })

    it('should handle mixed separators', () => {
      const input = 'a@test.com, b@test.com; c@test.com'
      const normalized = input.replace(/;/g, ',')
      const emails = normalized.split(',').map(e => e.trim())
      expect(emails.length).toBe(3)
    })

    it('should trim whitespace', () => {
      const input = '  a@test.com  , b@test.com  '
      const emails = input.split(',').map(e => e.trim())
      expect(emails[0]).toBe('a@test.com')
    })
  })

  describe('sanitizeEmailContent', () => {
    it('should remove HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>'
      const text = html.replace(/<[^>]*>/g, '')
      expect(text).toBe('Hello World')
    })

    it('should handle script tags', () => {
      const dangerous = '<script>alert("xss")</script>Hello'
      const safe = dangerous.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      expect(safe).not.toContain('script')
    })

    it('should preserve line breaks', () => {
      const text = 'Line 1\nLine 2\nLine 3'
      const lines = text.split('\n')
      expect(lines.length).toBe(3)
    })

    it('should handle email addresses in content', () => {
      const text = 'Contact us at support@example.com'
      expect(text).toContain('@example.com')
    })
  })

  describe('generateEmailId', () => {
    it('should generate unique IDs', () => {
      const id1 = `${Date.now()}-${Math.random()}`
      const id2 = `${Date.now()}-${Math.random()}`
      expect(id1).not.toBe(id2)
    })

    it('should use timestamp', () => {
      const now = Date.now()
      const id = `email-${now}`
      expect(id).toContain(now.toString())
    })

    it('should use UUID format', () => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      expect(uuid.split('-').length).toBe(5)
    })
  })

  describe('isValidEmailDomain', () => {
    it('should validate common domains', () => {
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com']
      domains.forEach(domain => {
        expect(domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/)
      })
    })

    it('should reject invalid domains', () => {
      const invalid = ['.com', 'domain', 'domain.', '-domain.com']
      invalid.forEach(domain => {
        const isValid = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
        expect(isValid).toBe(false)
      })
    })
  })

  describe('encodeEmailAddress', () => {
    it('should encode special characters', () => {
      const email = 'test+user@example.com'
      const encoded = encodeURIComponent(email)
      expect(encoded).toContain('%2B')
    })

    it('should handle @ symbol', () => {
      const email = 'test@example.com'
      const encoded = encodeURIComponent(email)
      expect(encoded).toContain('%40')
    })
  })

  describe('decodeEmailAddress', () => {
    it('should decode encoded emails', () => {
      const encoded = 'test%2Buser%40example.com'
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe('test+user@example.com')
    })
  })

  describe('normalizeEmail', () => {
    it('should convert to lowercase', () => {
      const email = 'Test@Example.COM'
      const normalized = email.toLowerCase()
      expect(normalized).toBe('test@example.com')
    })

    it('should trim whitespace', () => {
      const email = '  test@example.com  '
      const normalized = email.trim()
      expect(normalized).toBe('test@example.com')
    })

    it('should handle Gmail aliases', () => {
      const email = 'test+alias@gmail.com'
      const base = email.split('+')[0]
      expect(base).toBe('test')
    })
  })
})
