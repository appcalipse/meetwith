import { renderHook, act } from '@testing-library/react'
import { useCallback, useRef, useEffect } from 'react'

export interface DebouncedState<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined
  cancel: () => void
  flush: () => void
  isPending: () => boolean
}

function useDebounceCallback<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
): DebouncedState<T> {
  const funcRef = useRef(func)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const maxTimeoutRef = useRef<NodeJS.Timeout>()
  const lastCallTimeRef = useRef<number>(0)
  const lastInvokeTimeRef = useRef<number>(0)
  const pendingRef = useRef(false)

  funcRef.current = func

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current)
      maxTimeoutRef.current = undefined
    }
    pendingRef.current = false
  }, [])

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      funcRef.current()
      timeoutRef.current = undefined
    }
    pendingRef.current = false
  }, [])

  const isPending = useCallback(() => pendingRef.current, [])

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      const time = Date.now()
      const isLeading = options?.leading && !timeoutRef.current

      lastCallTimeRef.current = time
      pendingRef.current = true

      if (isLeading) {
        funcRef.current(...args)
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        if (options?.trailing !== false) {
          funcRef.current(...args)
        }
        pendingRef.current = false
      }, delay)
    },
    [delay, options]
  )

  const debouncedWithMethods = debounced as DebouncedState<T>
  debouncedWithMethods.cancel = cancel
  debouncedWithMethods.flush = flush
  debouncedWithMethods.isPending = isPending

  useEffect(() => cancel, [cancel])

  return debouncedWithMethods
}

describe('useDebounceCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce function calls', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 500))

    act(() => {
      result.current('call1')
      result.current('call2')
      result.current('call3')
    })

    expect(fn).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('call3')
  })

  it('should support leading option', () => {
    const fn = jest.fn()
    const { result } = renderHook(() =>
      useDebounceCallback(fn, 500, { leading: true })
    )

    act(() => {
      result.current('arg')
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('arg')
  })

  it('should support trailing option disabled', () => {
    const fn = jest.fn()
    const { result } = renderHook(() =>
      useDebounceCallback(fn, 500, { trailing: false })
    )

    act(() => {
      result.current('arg')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn).not.toHaveBeenCalled()
  })

  it('should cancel debounced calls', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 500))

    act(() => {
      result.current('arg')
    })

    act(() => {
      result.current.cancel()
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn).not.toHaveBeenCalled()
  })

  it('should flush debounced calls', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 500))

    act(() => {
      result.current('arg')
    })

    act(() => {
      result.current.flush()
    })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should report pending state', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 500))

    expect(result.current.isPending()).toBe(false)

    act(() => {
      result.current('arg')
    })

    expect(result.current.isPending()).toBe(true)

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current.isPending()).toBe(false)
  })

  it('should handle multiple arguments', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 500))

    act(() => {
      result.current('arg1', 'arg2', 'arg3')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  it('should cancel on unmount', () => {
    const fn = jest.fn()
    const { result, unmount } = renderHook(() => useDebounceCallback(fn, 500))

    act(() => {
      result.current('arg')
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn).not.toHaveBeenCalled()
  })

  it('should use latest function reference', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    const { result, rerender } = renderHook(
      ({ callback }) => useDebounceCallback(callback, 500),
      { initialProps: { callback: fn1 } }
    )

    act(() => {
      result.current('arg')
    })

    rerender({ callback: fn2 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('should handle zero delay', () => {
    const fn = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(fn, 0))

    act(() => {
      result.current('arg')
    })

    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
