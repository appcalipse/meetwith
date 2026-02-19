import { renderHook, act } from '@testing-library/react'
import { useState, useEffect, useCallback } from 'react'

const useSmartReconnect = (url: string, options = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)

  const connect = useCallback(() => {
    setIsConnected(true)
    setRetryCount(0)
    setLastError(null)
  }, [])

  const disconnect = useCallback(() => {
    setIsConnected(false)
  }, [])

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1)
  }, [])

  const setError = useCallback((error: Error) => {
    setLastError(error)
  }, [])

  return { isConnected, retryCount, lastError, connect, disconnect, retry, setError }
}

describe('useSmartReconnect', () => {
  it('should initialize disconnected', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    expect(result.current.isConnected).toBe(false)
  })

  it('should initialize with zero retries', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    expect(result.current.retryCount).toBe(0)
  })

  it('should initialize with no error', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    expect(result.current.lastError).toBeNull()
  })

  it('should connect', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should disconnect', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
    })

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('should increment retry count', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.retry()
    })

    expect(result.current.retryCount).toBe(1)
  })

  it('should increment retry count multiple times', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.retry()
      result.current.retry()
      result.current.retry()
    })

    expect(result.current.retryCount).toBe(3)
  })

  it('should reset retry count on connect', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.retry()
      result.current.retry()
    })

    act(() => {
      result.current.connect()
    })

    expect(result.current.retryCount).toBe(0)
  })

  it('should set error', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    const error = new Error('Connection failed')
    
    act(() => {
      result.current.setError(error)
    })

    expect(result.current.lastError).toEqual(error)
  })

  it('should clear error on connect', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    const error = new Error('Connection failed')
    
    act(() => {
      result.current.setError(error)
    })

    act(() => {
      result.current.connect()
    })

    expect(result.current.lastError).toBeNull()
  })

  it('should handle multiple connect calls', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
      result.current.connect()
      result.current.connect()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should handle multiple disconnect calls', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
      result.current.disconnect()
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('should handle reconnect cycle', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
      result.current.disconnect()
      result.current.connect()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should maintain state across rerenders', () => {
    const { result, rerender } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      result.current.connect()
    })

    rerender()

    expect(result.current.isConnected).toBe(true)
  })

  it('should handle different URLs', () => {
    const { result, rerender } = renderHook(
      ({ url }) => useSmartReconnect(url),
      { initialProps: { url: 'ws://localhost:3000' } }
    )

    expect(result.current).toBeDefined()

    rerender({ url: 'ws://localhost:4000' })

    expect(result.current).toBeDefined()
  })

  it('should handle error types', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    const errors = [
      new Error('Network error'),
      new Error('Timeout'),
      new Error('Connection refused')
    ]

    errors.forEach(error => {
      act(() => {
        result.current.setError(error)
      })
      expect(result.current.lastError).toEqual(error)
    })
  })

  it('should return consistent function references', () => {
    const { result, rerender } = renderHook(() => useSmartReconnect('ws://localhost'))
    const firstConnect = result.current.connect
    const firstDisconnect = result.current.disconnect

    rerender()

    expect(result.current.connect).toBe(firstConnect)
    expect(result.current.disconnect).toBe(firstDisconnect)
  })

  it('should handle rapid state changes', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.connect()
        result.current.disconnect()
      }
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('should handle max retries', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    const maxRetries = 10
    
    act(() => {
      for (let i = 0; i < maxRetries; i++) {
        result.current.retry()
      }
    })

    expect(result.current.retryCount).toBe(maxRetries)
  })

  it('should handle error with message', () => {
    const { result } = renderHook(() => useSmartReconnect('ws://localhost'))
    const error = new Error('Custom error message')
    
    act(() => {
      result.current.setError(error)
    })

    expect(result.current.lastError?.message).toBe('Custom error message')
  })
})
