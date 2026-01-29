import { renderHook } from '@testing-library/react'
import { useRef, useEffect } from 'react'

const useUnmount = (fn: () => void) => {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => () => fnRef.current(), [])
}

describe('useUnmount', () => {
  it('should call function on unmount', () => {
    const fn = jest.fn()
    const { unmount } = renderHook(() => useUnmount(fn))
    
    expect(fn).not.toHaveBeenCalled()
    unmount()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call latest function reference', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()
    
    const { rerender, unmount } = renderHook(
      ({ callback }) => useUnmount(callback),
      { initialProps: { callback: fn1 } }
    )
    
    rerender({ callback: fn2 })
    unmount()
    
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('should only call function once on unmount', () => {
    const fn = jest.fn()
    const { unmount } = renderHook(() => useUnmount(fn))
    
    unmount()
    unmount()
    
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not call function on rerender', () => {
    const fn = jest.fn()
    const { rerender } = renderHook(() => useUnmount(fn))
    
    rerender()
    rerender()
    rerender()
    
    expect(fn).not.toHaveBeenCalled()
  })

  it('should handle function that throws error', () => {
    const fn = jest.fn(() => { throw new Error('Test error') })
    const { unmount } = renderHook(() => useUnmount(fn))
    
    expect(() => unmount()).toThrow('Test error')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle async function', async () => {
    const fn = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    const { unmount } = renderHook(() => useUnmount(fn))
    
    unmount()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle function with side effects', () => {
    let sideEffect = 0
    const fn = jest.fn(() => { sideEffect++ })
    const { unmount } = renderHook(() => useUnmount(fn))
    
    expect(sideEffect).toBe(0)
    unmount()
    expect(sideEffect).toBe(1)
  })

  it('should handle multiple rerenders before unmount', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const fn3 = jest.fn()
    
    const { rerender, unmount } = renderHook(
      ({ callback }) => useUnmount(callback),
      { initialProps: { callback: fn1 } }
    )
    
    rerender({ callback: fn2 })
    rerender({ callback: fn3 })
    unmount()
    
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).not.toHaveBeenCalled()
    expect(fn3).toHaveBeenCalledTimes(1)
  })

  it('should handle empty function', () => {
    const fn = jest.fn()
    const { unmount } = renderHook(() => useUnmount(fn))
    
    unmount()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle function with arguments bound', () => {
    const fn = jest.fn()
    const boundFn = fn.bind(null, 'arg1', 'arg2')
    const { unmount } = renderHook(() => useUnmount(boundFn))
    
    unmount()
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})
