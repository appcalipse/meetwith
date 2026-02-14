import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

const useSlotCache = () => {
  const [cache, setCache] = useState<Record<string, any>>({})

  const get = (key: string) => cache[key]
  const set = (key: string, value: any) => {
    setCache(prev => ({ ...prev, [key]: value }))
  }
  const clear = () => setCache({})
  const remove = (key: string) => {
    setCache(prev => {
      const newCache = { ...prev }
      delete newCache[key]
      return newCache
    })
  }

  return { get, set, clear, remove, cache }
}

describe('useSlotCache', () => {
  it('should initialize with empty cache', () => {
    const { result } = renderHook(() => useSlotCache())
    expect(Object.keys(result.current.cache).length).toBe(0)
  })

  it('should set and get values', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
    })

    expect(result.current.get('key1')).toBe('value1')
  })

  it('should handle multiple keys', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
      result.current.set('key2', 'value2')
      result.current.set('key3', 'value3')
    })

    expect(result.current.get('key1')).toBe('value1')
    expect(result.current.get('key2')).toBe('value2')
    expect(result.current.get('key3')).toBe('value3')
  })

  it('should clear all entries', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
      result.current.set('key2', 'value2')
    })

    act(() => {
      result.current.clear()
    })

    expect(Object.keys(result.current.cache).length).toBe(0)
  })

  it('should remove specific key', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
      result.current.set('key2', 'value2')
    })

    act(() => {
      result.current.remove('key1')
    })

    expect(result.current.get('key1')).toBeUndefined()
    expect(result.current.get('key2')).toBe('value2')
  })

  it('should handle undefined get', () => {
    const { result } = renderHook(() => useSlotCache())
    expect(result.current.get('nonexistent')).toBeUndefined()
  })

  it('should overwrite existing values', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
    })

    act(() => {
      result.current.set('key1', 'value2')
    })

    expect(result.current.get('key1')).toBe('value2')
  })

  it('should handle object values', () => {
    const { result } = renderHook(() => useSlotCache())
    const obj = { nested: { value: 123 } }
    
    act(() => {
      result.current.set('key1', obj)
    })

    expect(result.current.get('key1')).toEqual(obj)
  })

  it('should handle array values', () => {
    const { result } = renderHook(() => useSlotCache())
    const arr = [1, 2, 3, 4, 5]
    
    act(() => {
      result.current.set('key1', arr)
    })

    expect(result.current.get('key1')).toEqual(arr)
  })

  it('should handle null values', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', null)
    })

    expect(result.current.get('key1')).toBeNull()
  })

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', true)
      result.current.set('key2', false)
    })

    expect(result.current.get('key1')).toBe(true)
    expect(result.current.get('key2')).toBe(false)
  })

  it('should handle numeric values', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 42)
      result.current.set('key2', 3.14)
    })

    expect(result.current.get('key1')).toBe(42)
    expect(result.current.get('key2')).toBe(3.14)
  })

  it('should maintain cache across rerenders', () => {
    const { result, rerender } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
    })

    rerender()

    expect(result.current.get('key1')).toBe('value1')
  })

  it('should handle rapid updates', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.set(`key${i}`, `value${i}`)
      }
    })

    expect(Object.keys(result.current.cache).length).toBe(100)
  })

  it('should handle removing nonexistent key', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.remove('nonexistent')
    })

    expect(Object.keys(result.current.cache).length).toBe(0)
  })

  it('should handle empty string key', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('', 'value')
    })

    expect(result.current.get('')).toBe('value')
  })

  it('should handle special character keys', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key-with-dashes', 'value1')
      result.current.set('key_with_underscores', 'value2')
      result.current.set('key.with.dots', 'value3')
    })

    expect(result.current.get('key-with-dashes')).toBe('value1')
    expect(result.current.get('key_with_underscores')).toBe('value2')
    expect(result.current.get('key.with.dots')).toBe('value3')
  })

  it('should handle long keys', () => {
    const { result } = renderHook(() => useSlotCache())
    const longKey = 'a'.repeat(1000)
    
    act(() => {
      result.current.set(longKey, 'value')
    })

    expect(result.current.get(longKey)).toBe('value')
  })

  it('should handle large objects', () => {
    const { result } = renderHook(() => useSlotCache())
    const largeObj = { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })) }
    
    act(() => {
      result.current.set('large', largeObj)
    })

    expect(result.current.get('large')).toEqual(largeObj)
  })

  it('should clear cache multiple times', () => {
    const { result } = renderHook(() => useSlotCache())
    
    act(() => {
      result.current.set('key1', 'value1')
      result.current.clear()
      result.current.set('key2', 'value2')
      result.current.clear()
    })

    expect(Object.keys(result.current.cache).length).toBe(0)
  })
})
