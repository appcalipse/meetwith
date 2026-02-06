import {
  zeroAddress, parseUnits, formatUnits, getSlugFromText, isJson,
  convertMinutes, formatCurrency, deduplicateArray, formatCountdown
} from '@/utils/generic_utils'

describe('Generic Utils Execution Tests', () => {
  describe('zeroAddress', () => {
    it('executes constant', () => {
      expect(zeroAddress).toBe('0x0000000000000000000000000000000000000000')
      expect(zeroAddress.length).toBe(42)
    })
  })

  describe('parseUnits', () => {
    it('executes with 1 and 18 decimals', () => {
      const result = parseUnits('1', 18)
      expect(typeof result).toBe('bigint')
    })

    it('executes with decimal', () => {
      const result = parseUnits('1.5', 18)
      expect(typeof result).toBe('bigint')
    })

    it('executes with zero', () => {
      const result = parseUnits('0', 18)
      expect(result).toBe(0n)
    })
  })

  describe('formatUnits', () => {
    it('executes with 1 ETH', () => {
      const result = formatUnits(1000000000000000000n, 18)
      expect(typeof result).toBe('string')
    })

    it('executes with 0', () => {
      const result = formatUnits(0n, 18)
      expect(result).toBe('0.0')
    })

    it('executes with 6 decimals', () => {
      const result = formatUnits(1000000n, 6)
      expect(result).toBeDefined()
    })
  })

  describe('getSlugFromText', () => {
    it('executes with simple text', () => {
      const result = getSlugFromText('Hello World')
      expect(result).toBe('hello-world')
    })

    it('executes with special characters', () => {
      const result = getSlugFromText('Hello, World!')
      expect(result).toContain('hello')
    })

    it('executes with numbers', () => {
      const result = getSlugFromText('Test 123')
      expect(result).toContain('123')
    })

    it('executes with hyphens', () => {
      const result = getSlugFromText('hello-world')
      expect(result).toBe('hello-world')
    })
  })

  describe('isJson', () => {
    it('executes with valid JSON', () => {
      const result = isJson('{"key": "value"}')
      expect(result).toBe(true)
    })

    it('executes with JSON array', () => {
      const result = isJson('[1, 2, 3]')
      expect(result).toBe(true)
    })

    it('executes with invalid JSON', () => {
      const result = isJson('not json')
      expect(result).toBe(false)
    })

    it('executes with empty string', () => {
      const result = isJson('')
      expect(result).toBe(false)
    })

    it('executes with number', () => {
      const result = isJson('123')
      expect(result).toBe(true)
    })

    it('executes with null', () => {
      const result = isJson('null')
      expect(result).toBe(true)
    })

    it('executes with boolean', () => {
      const result = isJson('true')
      expect(result).toBe(true)
    })
  })

  describe('convertMinutes', () => {
    it('executes with 30 minutes', () => {
      const result = convertMinutes(30)
      expect(result.hours).toBe(0)
      expect(result.minutes).toBe(30)
    })

    it('executes with 60 minutes', () => {
      const result = convertMinutes(60)
      expect(result.hours).toBe(1)
      expect(result.minutes).toBe(0)
    })

    it('executes with 90 minutes', () => {
      const result = convertMinutes(90)
      expect(result.hours).toBe(1)
      expect(result.minutes).toBe(30)
    })

    it('executes with 0 minutes', () => {
      const result = convertMinutes(0)
      expect(result.hours).toBe(0)
      expect(result.minutes).toBe(0)
    })

    it('executes with 120 minutes', () => {
      const result = convertMinutes(120)
      expect(result.hours).toBe(2)
      expect(result.minutes).toBe(0)
    })
  })

  describe('formatCurrency', () => {
    it('executes with USD', () => {
      const result = formatCurrency(100, 'USD')
      expect(typeof result).toBe('string')
      expect(result).toContain('100')
    })

    it('executes with EUR', () => {
      const result = formatCurrency(50.50, 'EUR')
      expect(result).toContain('50')
    })

    it('executes with zero', () => {
      const result = formatCurrency(0, 'USD')
      expect(result).toBeDefined()
    })
  })

  describe('deduplicateArray', () => {
    it('executes with strings', () => {
      const result = deduplicateArray(['a', 'b', 'a', 'c'])
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('executes with numbers', () => {
      const result = deduplicateArray([1, 2, 1, 3, 2])
      expect(result).toEqual([1, 2, 3])
    })

    it('executes with empty array', () => {
      const result = deduplicateArray([])
      expect(result).toHaveLength(0)
    })

    it('executes with all duplicates', () => {
      const result = deduplicateArray(['a', 'a', 'a'])
      expect(result).toEqual(['a'])
    })
  })

  describe('formatCountdown', () => {
    it('executes with 0 seconds', () => {
      const result = formatCountdown(0)
      expect(typeof result).toBe('string')
    })

    it('executes with 30 seconds', () => {
      const result = formatCountdown(30)
      expect(result).toContain('00:30')
    })

    it('executes with 60 seconds', () => {
      const result = formatCountdown(60)
      expect(result).toContain('01:00')
    })

    it('executes with 90 seconds', () => {
      const result = formatCountdown(90)
      expect(result).toContain('01:30')
    })
  })
})
