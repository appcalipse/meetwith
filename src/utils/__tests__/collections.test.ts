import { diff, intersec } from '../collections'

describe('collections', () => {
  describe('diff', () => {
    it('should return elements in first array not in second', () => {
      const a = ['a', 'b', 'c', 'd']
      const b = ['b', 'd', 'e']
      
      expect(diff(a, b)).toEqual(['a', 'c'])
    })

    it('should return empty array when all elements are in second array', () => {
      const a = ['a', 'b', 'c']
      const b = ['a', 'b', 'c', 'd', 'e']
      
      expect(diff(a, b)).toEqual([])
    })

    it('should return all elements when arrays have no overlap', () => {
      const a = ['a', 'b', 'c']
      const b = ['d', 'e', 'f']
      
      expect(diff(a, b)).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty arrays', () => {
      expect(diff([], ['a', 'b'])).toEqual([])
      expect(diff(['a', 'b'], [])).toEqual(['a', 'b'])
      expect(diff([], [])).toEqual([])
    })

    it('should handle duplicate values', () => {
      const a = ['a', 'a', 'b', 'c']
      const b = ['a', 'c']
      
      expect(diff(a, b)).toEqual(['b'])
    })

    it('should be case sensitive', () => {
      const a = ['a', 'A', 'b', 'B']
      const b = ['a', 'b']
      
      expect(diff(a, b)).toEqual(['A', 'B'])
    })
  })

  describe('intersec', () => {
    it('should return common elements', () => {
      const a = ['a', 'b', 'c', 'd']
      const b = ['b', 'd', 'e', 'f']
      
      expect(intersec(a, b)).toEqual(['b', 'd'])
    })

    it('should return empty array when no common elements', () => {
      const a = ['a', 'b', 'c']
      const b = ['d', 'e', 'f']
      
      expect(intersec(a, b)).toEqual([])
    })

    it('should return all elements when arrays are identical', () => {
      const a = ['a', 'b', 'c']
      const b = ['a', 'b', 'c']
      
      expect(intersec(a, b)).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty arrays', () => {
      expect(intersec([], ['a', 'b'])).toEqual([])
      expect(intersec(['a', 'b'], [])).toEqual([])
      expect(intersec([], [])).toEqual([])
    })

    it('should handle duplicate values in first array', () => {
      const a = ['a', 'a', 'b', 'c']
      const b = ['a', 'c']
      
      expect(intersec(a, b)).toEqual(['a', 'a', 'c'])
    })

    it('should be case sensitive', () => {
      const a = ['a', 'A', 'b', 'B']
      const b = ['a', 'b', 'c']
      
      expect(intersec(a, b)).toEqual(['a', 'b'])
    })

    it('should preserve order from first array', () => {
      const a = ['c', 'a', 'b', 'd']
      const b = ['b', 'a', 'c']
      
      expect(intersec(a, b)).toEqual(['c', 'a', 'b'])
    })
  })
})
