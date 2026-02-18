import { renderHook, act } from '@testing-library/react'
import usePoller from '@/hooks/usePoller'

describe('usePoller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return a poller function', () => {
    const { result } = renderHook(() => usePoller())
    expect(typeof result.current).toBe('function')
  })

  it('should poll until completed is true', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: true })

    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 1000)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(3)
  })

  it('should use default delay of 2000ms', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: true })

    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(2)
  })

  it('should throw error when aborted', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockResolvedValue({ completed: false })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 1000)

    await act(async () => {
      await Promise.resolve()
      abortController.abort()
    })

    await expect(promise).rejects.toThrow('Polling aborted')
  })

  it('should stop polling when aborted mid-delay', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockResolvedValue({ completed: false })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 5000)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(2000)
      abortController.abort()
    })

    await expect(promise).rejects.toThrow('Polling aborted')
    expect(pollFn).toHaveBeenCalledTimes(1)
  })

  it('should handle immediate completion', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockResolvedValue({ completed: true })
    const abortController = new AbortController()

    await act(async () => {
      await result.current(pollFn, abortController.signal, 1000)
    })

    expect(pollFn).toHaveBeenCalledTimes(1)
  })

  it('should handle custom delay times', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: true })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 500)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(500)
      await Promise.resolve()
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(2)
  })

  it('should handle errors in pollFn', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockRejectedValue(new Error('Poll error'))
    const abortController = new AbortController()

    await expect(
      result.current(pollFn, abortController.signal, 1000)
    ).rejects.toThrow('Poll error')
  })

  it('should clean up timeout on abort', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockResolvedValue({ completed: false })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 10000)

    await act(async () => {
      await Promise.resolve()
      abortController.abort()
    })

    const pendingTimers = jest.getTimerCount()
    await expect(promise).rejects.toThrow('Polling aborted')
    
    expect(jest.getTimerCount()).toBeLessThanOrEqual(pendingTimers)
  })

  it('should continue polling until completed even with many iterations', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
    
    for (let i = 0; i < 9; i++) {
      pollFn.mockResolvedValueOnce({ completed: false })
    }
    pollFn.mockResolvedValueOnce({ completed: true })

    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 100)

    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve()
        jest.advanceTimersByTime(100)
      }
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(10)
  })

  it('should handle zero delay', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: true })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 0)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(0)
      await Promise.resolve()
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(2)
  })

  it('should return same function reference across renders', () => {
    const { result, rerender } = renderHook(() => usePoller())
    const firstPoller = result.current

    rerender()

    expect(result.current).toBe(firstPoller)
  })

  it('should handle abort before first poll completes', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ completed: false }), 1000)))
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 1000)

    abortController.abort()

    await expect(promise).rejects.toThrow('Polling aborted')
  })

  it('should handle multiple abort listeners', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn().mockResolvedValue({ completed: false })
    const abortController = new AbortController()

    const otherListener = jest.fn()
    abortController.signal.addEventListener('abort', otherListener)

    const promise = result.current(pollFn, abortController.signal, 1000)

    await act(async () => {
      await Promise.resolve()
      abortController.abort()
    })

    await expect(promise).rejects.toThrow('Polling aborted')
    expect(otherListener).toHaveBeenCalled()
  })

  it('should handle very long delays', async () => {
    const { result } = renderHook(() => usePoller())
    const pollFn = jest.fn()
      .mockResolvedValueOnce({ completed: false })
      .mockResolvedValueOnce({ completed: true })
    const abortController = new AbortController()

    const promise = result.current(pollFn, abortController.signal, 100000)

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(100000)
      await Promise.resolve()
    })

    await promise

    expect(pollFn).toHaveBeenCalledTimes(2)
  })
})
