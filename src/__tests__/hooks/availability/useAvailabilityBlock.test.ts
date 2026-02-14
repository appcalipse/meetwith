import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useAvailabilityBlock = (id: string) => {
  return useSWR(id ? `/api/availability/block/${id}` : null)
}

describe('useAvailabilityBlock', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch block when id is provided', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useAvailabilityBlock('block-1'))
    expect(mockUseSWR).toHaveBeenCalledWith('/api/availability/block/block-1')
  })

  it('should not fetch when id is empty', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useAvailabilityBlock(''))
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('should return block data when loaded', () => {
    const mockData = { id: 'block-1', start: '09:00', end: '17:00' }
    mockUseSWR.mockReturnValue({ data: mockData, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlock('block-1'))
    expect(result.current.data).toEqual(mockData)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Not found')
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlock('block-1'))
    expect(result.current.error).toEqual(mockError)
  })

  it('should handle null id', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useAvailabilityBlock(null as any))
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('should handle undefined id', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useAvailabilityBlock(undefined as any))
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('should update when id changes', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { rerender } = renderHook(
      ({ id }) => useAvailabilityBlock(id),
      { initialProps: { id: 'block-1' } }
    )
    rerender({ id: 'block-2' })
    expect(mockUseSWR).toHaveBeenCalledWith('/api/availability/block/block-2')
  })

  it('should return loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { result } = renderHook(() => useAvailabilityBlock('block-1'))
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle complex block data', () => {
    const complexData = {
      id: 'block-1',
      start: '09:00',
      end: '17:00',
      days: ['monday', 'tuesday'],
      timezone: 'America/New_York'
    }
    mockUseSWR.mockReturnValue({ data: complexData, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlock('block-1'))
    expect(result.current.data).toEqual(complexData)
  })

  it('should handle very long IDs', () => {
    const longId = 'a'.repeat(1000)
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useAvailabilityBlock(longId))
    expect(mockUseSWR).toHaveBeenCalledWith(`/api/availability/block/${longId}`)
  })
})
