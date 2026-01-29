import { renderHook, act } from '@testing-library/react'
import { useDebounceValue } from '../useDebounceValue'

jest.mock('../useDebounceCallback', () => ({
  useDebounceCallback: jest.fn((fn, delay, options) => {
    let timeoutId: NodeJS.Timeout | null = null
    const debouncedFn = (...args: any[]) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
    debouncedFn.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
    debouncedFn.flush = () => {}
    debouncedFn.isPending = () => false
    return debouncedFn
  }),
}))

describe('useDebounceValue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with initial value', () => {
    const { result } = renderHook(() => useDebounceValue('initial', 500))
    
    expect(result.current[0]).toBe('initial')
  })

  it('should initialize with function value', () => {
    const { result } = renderHook(() => useDebounceValue(() => 'computed', 500))
    
    expect(result.current[0]).toBe('computed')
  })

  it('should debounce value updates', () => {
    const { result } = renderHook(() => useDebounceValue('initial', 500))
    
    act(() => {
      result.current[1]('updated')
    })
    
    expect(result.current[0]).toBe('initial')
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toBe('updated')
  })

  it('should use custom equality function', () => {
    const equalityFn = jest.fn((a, b) => a === b)
    const { result } = renderHook(() => 
      useDebounceValue('initial', 500, { equalityFn })
    )
    
    act(() => {
      result.current[1]('updated')
    })
    
    expect(equalityFn).toHaveBeenCalled()
  })

  it('should support leading option', () => {
    const { result } = renderHook(() => 
      useDebounceValue('initial', 500, { leading: true })
    )
    
    act(() => {
      result.current[1]('updated')
    })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toBe('updated')
  })

  it('should support trailing option', () => {
    const { result } = renderHook(() => 
      useDebounceValue('initial', 500, { trailing: true })
    )
    
    act(() => {
      result.current[1]('updated')
    })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toBe('updated')
  })

  it('should support maxWait option', () => {
    const { result } = renderHook(() => 
      useDebounceValue('initial', 500, { maxWait: 1000 })
    )
    
    act(() => {
      result.current[1]('updated')
    })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
  })

  it('should handle multiple rapid updates', () => {
    const { result } = renderHook(() => useDebounceValue(0, 500))
    
    act(() => {
      result.current[1](1)
      result.current[1](2)
      result.current[1](3)
    })
    
    expect(result.current[0]).toBe(0)
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toBe(3)
  })

  it('should update when initial value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounceValue(value, 500),
      { initialProps: { value: 'initial' } }
    )
    
    expect(result.current[0]).toBe('initial')
    
    rerender({ value: 'changed' })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toBe('changed')
  })

  it('should handle object values', () => {
    const { result } = renderHook(() => 
      useDebounceValue({ count: 0 }, 500, {
        equalityFn: (a, b) => a.count === b.count
      })
    )
    
    act(() => {
      result.current[1]({ count: 1 })
    })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toEqual({ count: 1 })
  })

  it('should handle array values', () => {
    const { result } = renderHook(() => useDebounceValue([1, 2, 3], 500))
    
    act(() => {
      result.current[1]([4, 5, 6])
    })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(result.current[0]).toEqual([4, 5, 6])
  })
})
