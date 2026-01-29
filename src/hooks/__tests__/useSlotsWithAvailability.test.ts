import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useSlotsWithAvailability = (date: string, userId: string) => {
  return useSWR(
    date && userId ? `/api/slots?date=${date}&userId=${userId}` : null,
    null
  )
}

describe('useSlotsWithAvailability', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch when date and userId provided', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(mockUseSWR).toHaveBeenCalledWith('/api/slots?date=2024-01-01&userId=user-123', null)
  })

  it('should not fetch when date missing', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useSlotsWithAvailability('', 'user-123'))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should not fetch when userId missing', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useSlotsWithAvailability('2024-01-01', ''))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should return slots data', () => {
    const slots = [{ start: '09:00', end: '10:00', available: true }]
    mockUseSWR.mockReturnValue({ data: slots, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(result.current.data).toEqual(slots)
  })

  it('should return error when fetch fails', () => {
    const error = new Error('Failed')
    mockUseSWR.mockReturnValue({ data: undefined, error, isLoading: false } as any)
    const { result } = renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(result.current.error).toEqual(error)
  })

  it('should handle empty slots', () => {
    mockUseSWR.mockReturnValue({ data: [], error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(result.current.data).toEqual([])
  })

  it('should update when date changes', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { rerender } = renderHook(
      ({ date, userId }) => useSlotsWithAvailability(date, userId),
      { initialProps: { date: '2024-01-01', userId: 'user-123' } }
    )
    rerender({ date: '2024-01-02', userId: 'user-123' })
    expect(mockUseSWR).toHaveBeenCalledWith('/api/slots?date=2024-01-02&userId=user-123', null)
  })

  it('should update when userId changes', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { rerender } = renderHook(
      ({ date, userId }) => useSlotsWithAvailability(date, userId),
      { initialProps: { date: '2024-01-01', userId: 'user-123' } }
    )
    rerender({ date: '2024-01-01', userId: 'user-456' })
    expect(mockUseSWR).toHaveBeenCalledWith('/api/slots?date=2024-01-01&userId=user-456', null)
  })

  it('should handle loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { result } = renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle slots with availability flags', () => {
    const slots = [
      { start: '09:00', end: '10:00', available: true },
      { start: '10:00', end: '11:00', available: false }
    ]
    mockUseSWR.mockReturnValue({ data: slots, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useSlotsWithAvailability('2024-01-01', 'user-123'))
    expect(result.current.data).toEqual(slots)
  })

  it('should handle different date formats', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const dates = ['2024-01-01', '2024-12-31', '2023-06-15']
    dates.forEach(date => {
      renderHook(() => useSlotsWithAvailability(date, 'user-123'))
      expect(mockUseSWR).toHaveBeenCalledWith(`/api/slots?date=${date}&userId=user-123`, null)
    })
  })

  it('should handle different user IDs', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const userIds = ['user-1', 'user-2', 'user-3']
    userIds.forEach(userId => {
      renderHook(() => useSlotsWithAvailability('2024-01-01', userId))
      expect(mockUseSWR).toHaveBeenCalledWith(`/api/slots?date=2024-01-01&userId=${userId}`, null)
    })
  })

  it('should handle null date', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useSlotsWithAvailability(null as any, 'user-123'))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should handle null userId', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useSlotsWithAvailability('2024-01-01', null as any))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should handle undefined parameters', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useSlotsWithAvailability(undefined as any, undefined as any))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })
})
