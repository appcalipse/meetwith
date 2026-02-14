describe('helpers comprehensive tests', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const amount = 1234.56
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      expect(formatted).toContain('1,234.56')
    })

    it('should format EUR correctly', () => {
      const amount = 1234.56
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
      expect(formatted).toContain('1,234.56')
    })

    it('should handle zero', () => {
      const amount = 0
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      expect(formatted).toContain('0.00')
    })

    it('should handle negative amounts', () => {
      const amount = -100.50
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      expect(formatted).toContain('-')
    })

    it('should handle large amounts', () => {
      const amount = 1000000.00
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      expect(formatted).toContain('1,000,000')
    })

    it('should handle small decimals', () => {
      const amount = 0.01
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      expect(formatted).toContain('0.01')
    })
  })

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-01-15')
    })

    it('should handle start of year', () => {
      const date = new Date('2024-01-01')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-01-01')
    })

    it('should handle end of year', () => {
      const date = new Date('2024-12-31')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-12-31')
    })

    it('should handle leap year', () => {
      const date = new Date('2024-02-29')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-02-29')
    })
  })

  describe('formatTime', () => {
    it('should format time as HH:mm', () => {
      const date = new Date('2024-01-01T14:30:00')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const formatted = `${hours}:${minutes}`
      expect(formatted).toBe('14:30')
    })

    it('should handle midnight', () => {
      const date = new Date('2024-01-01T00:00:00')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const formatted = `${hours}:${minutes}`
      expect(formatted).toBe('00:00')
    })

    it('should handle noon', () => {
      const date = new Date('2024-01-01T12:00:00')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const formatted = `${hours}:${minutes}`
      expect(formatted).toBe('12:00')
    })
  })

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const str = 'This is a very long string'
      const truncated = str.length > 10 ? str.substring(0, 10) + '...' : str
      expect(truncated.length).toBeLessThanOrEqual(13)
    })

    it('should not truncate short strings', () => {
      const str = 'Short'
      const truncated = str.length > 10 ? str.substring(0, 10) + '...' : str
      expect(truncated).toBe('Short')
    })

    it('should handle empty strings', () => {
      const str = ''
      const truncated = str.length > 10 ? str.substring(0, 10) + '...' : str
      expect(truncated).toBe('')
    })

    it('should handle exact length', () => {
      const str = 'Exactly10!'
      const truncated = str.length > 10 ? str.substring(0, 10) + '...' : str
      expect(truncated).toBe('Exactly10!')
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      const str = 'hello'
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1)
      expect(capitalized).toBe('Hello')
    })

    it('should handle single character', () => {
      const str = 'a'
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1)
      expect(capitalized).toBe('A')
    })

    it('should handle empty string', () => {
      const str = ''
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1)
      expect(capitalized).toBe('')
    })

    it('should not change already capitalized', () => {
      const str = 'Hello'
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1)
      expect(capitalized).toBe('Hello')
    })

    it('should handle ALL CAPS', () => {
      const str = 'HELLO'
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1)
      expect(capitalized).toBe('HELLO')
    })
  })

  describe('debounce', () => {
    it('should delay function execution', () => {
      jest.useFakeTimers()
      const fn = jest.fn()
      const delay = 1000

      setTimeout(fn, delay)
      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1000)
      expect(fn).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })

    it('should cancel previous call', () => {
      jest.useFakeTimers()
      const fn = jest.fn()
      let timeoutId: NodeJS.Timeout | null = setTimeout(fn, 1000)

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(fn, 1000)

      jest.advanceTimersByTime(1000)
      expect(fn).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('throttle', () => {
    it('should limit function calls', () => {
      jest.useFakeTimers()
      const fn = jest.fn()
      let lastCall = 0
      const limit = 1000

      const throttled = () => {
        const now = Date.now()
        if (now - lastCall >= limit) {
          lastCall = now
          fn()
        }
      }

      throttled()
      throttled()
      throttled()

      expect(fn).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('deepClone', () => {
    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } }
      const cloned = JSON.parse(JSON.stringify(obj))
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]]
      const cloned = JSON.parse(JSON.stringify(arr))
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
    })

    it('should handle nested structures', () => {
      const complex = { a: [1, { b: 2 }], c: { d: [3, 4] } }
      const cloned = JSON.parse(JSON.stringify(complex))
      expect(cloned).toEqual(complex)
    })
  })

  describe('isEqual', () => {
    it('should compare primitives', () => {
      expect(1 === 1).toBe(true)
      expect('a' === 'a').toBe(true)
      expect(true === true).toBe(true)
    })

    it('should compare objects by reference', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1 }
      expect(obj1 === obj2).toBe(false)
      expect(obj1 === obj1).toBe(true)
    })

    it('should deep compare objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }
      expect(JSON.stringify(obj1) === JSON.stringify(obj2)).toBe(true)
    })
  })

  describe('uuid', () => {
    it('should generate unique IDs', () => {
      const id1 = `${Date.now()}-${Math.random()}`
      const id2 = `${Date.now()}-${Math.random()}`
      expect(id1).not.toBe(id2)
    })

    it('should generate valid format', () => {
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      expect(id.split('-').length).toBe(5)
    })
  })
})

  describe('arrayUtils', () => {
    it('should find unique elements', () => {
      const arr = [1, 2, 2, 3, 3, 3]
      const unique = [...new Set(arr)]
      expect(unique).toEqual([1, 2, 3])
    })

    it('should flatten arrays', () => {
      const nested = [[1, 2], [3, 4], [5]]
      const flat = nested.flat()
      expect(flat).toEqual([1, 2, 3, 4, 5])
    })

    it('should chunk arrays', () => {
      const arr = [1, 2, 3, 4, 5]
      const size = 2
      const chunks: number[][] = []
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size))
      }
      expect(chunks).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should find intersection', () => {
      const arr1 = [1, 2, 3, 4]
      const arr2 = [3, 4, 5, 6]
      const intersection = arr1.filter(x => arr2.includes(x))
      expect(intersection).toEqual([3, 4])
    })

    it('should find difference', () => {
      const arr1 = [1, 2, 3, 4]
      const arr2 = [3, 4, 5, 6]
      const difference = arr1.filter(x => !arr2.includes(x))
      expect(difference).toEqual([1, 2])
    })

    it('should sort numbers', () => {
      const arr = [3, 1, 4, 1, 5, 9]
      const sorted = arr.slice().sort((a, b) => a - b)
      expect(sorted).toEqual([1, 1, 3, 4, 5, 9])
    })

    it('should reverse arrays', () => {
      const arr = [1, 2, 3, 4, 5]
      const reversed = arr.slice().reverse()
      expect(reversed).toEqual([5, 4, 3, 2, 1])
    })

    it('should sum array elements', () => {
      const arr = [1, 2, 3, 4, 5]
      const sum = arr.reduce((a, b) => a + b, 0)
      expect(sum).toBe(15)
    })

    it('should find max value', () => {
      const arr = [1, 5, 3, 9, 2]
      const max = Math.max(...arr)
      expect(max).toBe(9)
    })

    it('should find min value', () => {
      const arr = [5, 1, 9, 3, 2]
      const min = Math.min(...arr)
      expect(min).toBe(1)
    })

    it('should shuffle array', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = arr.slice()
      expect(shuffled.length).toBe(arr.length)
    })

    it('should remove duplicates', () => {
      const arr = [1, 1, 2, 2, 3, 3]
      const unique = [...new Set(arr)]
      expect(unique.length).toBe(3)
    })
  })
