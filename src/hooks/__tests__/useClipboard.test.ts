import { renderHook, act } from '@testing-library/react'
import useClipboard from '../useClipboard'
import { logEvent } from '@/utils/analytics'

jest.mock('@/utils/analytics', () => ({
  logEvent: jest.fn(),
}))

describe('useClipboard', () => {
  let mockClipboard: { writeText: jest.Mock }
  let mockExecCommand: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    })

    mockExecCommand = jest.fn()
    document.execCommand = mockExecCommand
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with copyFeedbackOpen as false', () => {
    const { result } = renderHook(() => useClipboard())
    expect(result.current.copyFeedbackOpen).toBe(false)
  })

  it('should copy text using navigator.clipboard', async () => {
    const { result } = renderHook(() => useClipboard())
    const testUrl = 'https://example.com/meeting'

    await act(async () => {
      await result.current.handleCopy(testUrl)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(testUrl)
    expect(logEvent).toHaveBeenCalledWith('Copied link from Calendar', { url: testUrl })
    expect(result.current.copyFeedbackOpen).toBe(true)
  })

  it('should set copyFeedbackOpen to false after 2 seconds', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy('https://example.com')
    })

    expect(result.current.copyFeedbackOpen).toBe(true)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.copyFeedbackOpen).toBe(false)
  })

  it('should fallback to execCommand when clipboard API fails', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'))
    const { result } = renderHook(() => useClipboard())
    const testUrl = 'https://example.com/meeting'

    await act(async () => {
      await result.current.handleCopy(testUrl)
    })

    expect(mockExecCommand).toHaveBeenCalledWith('copy', true, testUrl)
    expect(result.current.copyFeedbackOpen).toBe(true)
  })

  it('should use execCommand when clipboard API is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useClipboard())
    const testUrl = 'https://example.com/meeting'

    await act(async () => {
      await result.current.handleCopy(testUrl)
    })

    expect(mockExecCommand).toHaveBeenCalledWith('copy', true, testUrl)
  })

  it('should handle empty string', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy('')
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith('')
    expect(logEvent).toHaveBeenCalledWith('Copied link from Calendar', { url: '' })
  })

  it('should handle very long URLs', async () => {
    const { result } = renderHook(() => useClipboard())
    const longUrl = 'https://example.com/' + 'a'.repeat(1000)

    await act(async () => {
      await result.current.handleCopy(longUrl)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(longUrl)
  })

  it('should handle special characters in URL', async () => {
    const { result } = renderHook(() => useClipboard())
    const specialUrl = 'https://example.com/meeting?id=123&name=Test%20Meeting&param=value'

    await act(async () => {
      await result.current.handleCopy(specialUrl)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(specialUrl)
  })

  it('should handle multiple consecutive copies', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy('url1')
    })

    expect(result.current.copyFeedbackOpen).toBe(true)

    await act(async () => {
      await result.current.handleCopy('url2')
    })

    expect(mockClipboard.writeText).toHaveBeenCalledTimes(2)
    expect(logEvent).toHaveBeenCalledTimes(2)
  })

  it('should reset feedback after timer for each copy', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy('url1')
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await act(async () => {
      await result.current.handleCopy('url2')
    })

    expect(result.current.copyFeedbackOpen).toBe(true)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.copyFeedbackOpen).toBe(false)
  })

  it('should handle Unicode characters', async () => {
    const { result } = renderHook(() => useClipboard())
    const unicodeUrl = 'https://example.com/meeting-会议-réunion'

    await act(async () => {
      await result.current.handleCopy(unicodeUrl)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(unicodeUrl)
  })

  it('should handle null-like values gracefully', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy(undefined as any)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith('')
  })

  it('should handle copy with spaces and newlines', async () => {
    const { result } = renderHook(() => useClipboard())
    const urlWithSpaces = 'https://example.com/meeting with spaces\nand newlines'

    await act(async () => {
      await result.current.handleCopy(urlWithSpaces)
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(urlWithSpaces)
  })

  it('should log analytics event with correct parameters', async () => {
    const { result } = renderHook(() => useClipboard())
    const testUrl = 'https://test.com/123'

    await act(async () => {
      await result.current.handleCopy(testUrl)
    })

    expect(logEvent).toHaveBeenCalledWith('Copied link from Calendar', { url: testUrl })
    expect(logEvent).toHaveBeenCalledTimes(1)
  })

  it('should handle rapid clicks within timeout period', async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.handleCopy('url1')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    await act(async () => {
      await result.current.handleCopy('url2')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    await act(async () => {
      await result.current.handleCopy('url3')
    })

    expect(mockClipboard.writeText).toHaveBeenCalledTimes(3)
  })
})
