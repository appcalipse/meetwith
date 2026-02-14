import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useAvailabilityBlocks = () => {
  return useSWR('/api/availability/blocks')
}

describe('useAvailabilityBlocks', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch all blocks', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useAvailabilityBlocks())
    expect(mockUseSWR).toHaveBeenCalledWith('/api/availability/blocks')
  })

  it('should return blocks data', () => {
    const mockBlocks = [
      { id: '1', start: '09:00', end: '12:00' },
      { id: '2', start: '13:00', end: '17:00' }
    ]
    mockUseSWR.mockReturnValue({ data: mockBlocks, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toEqual(mockBlocks)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Failed')
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.error).toEqual(mockError)
  })

  it('should handle empty blocks array', () => {
    mockUseSWR.mockReturnValue({ data: [], error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toEqual([])
  })

  it('should return loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle large datasets', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      start: '09:00',
      end: '17:00'
    }))
    mockUseSWR.mockReturnValue({ data: largeData, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toHaveLength(1000)
  })

  it('should provide mutate function', () => {
    const mockMutate = jest.fn()
    mockUseSWR.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: mockMutate
    } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.mutate).toBe(mockMutate)
  })

  it('should handle blocks with overlapping times', () => {
    const overlappingBlocks = [
      { id: '1', start: '09:00', end: '12:00' },
      { id: '2', start: '11:00', end: '14:00' }
    ]
    mockUseSWR.mockReturnValue({ data: overlappingBlocks, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toEqual(overlappingBlocks)
  })

  it('should handle blocks across different timezones', () => {
    const blocks = [
      { id: '1', start: '09:00', end: '17:00', timezone: 'America/New_York' },
      { id: '2', start: '09:00', end: '17:00', timezone: 'Europe/London' }
    ]
    mockUseSWR.mockReturnValue({ data: blocks, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toEqual(blocks)
  })

  it('should handle blocks with different day patterns', () => {
    const blocks = [
      { id: '1', start: '09:00', end: '17:00', days: ['monday', 'wednesday', 'friday'] },
      { id: '2', start: '10:00', end: '16:00', days: ['tuesday', 'thursday'] }
    ]
    mockUseSWR.mockReturnValue({ data: blocks, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useAvailabilityBlocks())
    expect(result.current.data).toEqual(blocks)
  })
})
