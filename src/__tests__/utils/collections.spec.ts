import { diff, intersec } from '@/utils/collections'

describe('collection utils', () => {
  describe('diff', () => {
    it('should load items from a that doesnt exist on b', () => {
      // given
      const a = ['d', 'a', 'b', 'c']
      const b = ['a', 'c']

      // when
      const result = diff(a, b)

      // then
      expect(result).toEqual(['d', 'b'])
    })

    it('should return all items from a when b is empty', () => {
      const a = ['a', 'b', 'c']
      const b: string[] = []

      const result = diff(a, b)

      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should return empty array when a is empty', () => {
      const a: string[] = []
      const b = ['a', 'b']

      const result = diff(a, b)

      expect(result).toEqual([])
    })

    it('should return empty array when all items in a exist in b', () => {
      const a = ['a', 'b', 'c']
      const b = ['a', 'b', 'c', 'd']

      const result = diff(a, b)

      expect(result).toEqual([])
    })

    it('should handle duplicate items in a', () => {
      const a = ['a', 'b', 'a', 'c']
      const b = ['a']

      const result = diff(a, b)

      expect(result).toEqual(['b', 'c'])
    })

    it('should handle both arrays empty', () => {
      const a: string[] = []
      const b: string[] = []

      const result = diff(a, b)

      expect(result).toEqual([])
    })
  })

  describe('intersec', () => {
    it('should find intersection items between a and b', () => {
      // given
      const a = ['d', 'a', 'b', 'c']
      const b = ['a', 'c', 'f']

      // when
      const result = intersec(a, b)

      // then
      expect(result).toEqual(['a', 'c'])
    })

    it('should return empty array when there is no intersection', () => {
      const a = ['a', 'b', 'c']
      const b = ['d', 'e', 'f']

      const result = intersec(a, b)

      expect(result).toEqual([])
    })

    it('should return empty array when a is empty', () => {
      const a: string[] = []
      const b = ['a', 'b']

      const result = intersec(a, b)

      expect(result).toEqual([])
    })

    it('should return empty array when b is empty', () => {
      const a = ['a', 'b']
      const b: string[] = []

      const result = intersec(a, b)

      expect(result).toEqual([])
    })

    it('should return all items when a and b are identical', () => {
      const a = ['a', 'b', 'c']
      const b = ['a', 'b', 'c']

      const result = intersec(a, b)

      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle duplicate items in a', () => {
      const a = ['a', 'b', 'a', 'c']
      const b = ['a', 'b']

      const result = intersec(a, b)

      expect(result).toEqual(['a', 'b', 'a'])
    })

    it('should handle both arrays empty', () => {
      const a: string[] = []
      const b: string[] = []

      const result = intersec(a, b)

      expect(result).toEqual([])
    })
  })
})
