import { renderHook, waitFor } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useAllMeetingTypes = () => {
  return useSWR('/api/meeting-types/all', null, {
    revalidateOnFocus: false,
  })
}

describe('useAllMeetingTypes', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call useSWR with correct parameters', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    renderHook(() => useAllMeetingTypes())

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/meeting-types/all',
      null,
      { revalidateOnFocus: false }
    )
  })

  it('should return loading state initially', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should return data when loaded', () => {
    const mockData = [
      { id: '1', name: 'Meeting Type 1' },
      { id: '2', name: 'Meeting Type 2' },
    ]

    mockUseSWR.mockReturnValue({
      data: mockData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.data).toEqual(mockData)
    expect(result.current.isLoading).toBe(false)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Failed to fetch')

    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.error).toEqual(mockError)
    expect(result.current.data).toBeUndefined()
  })

  it('should not revalidate on focus', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    renderHook(() => useAllMeetingTypes())

    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ revalidateOnFocus: false })
    )
  })

  it('should handle empty array data', () => {
    mockUseSWR.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.data).toEqual([])
  })

  it('should provide mutate function', () => {
    const mockMutate = jest.fn()

    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: mockMutate,
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.mutate).toBe(mockMutate)
  })

  it('should handle validating state', () => {
    mockUseSWR.mockReturnValue({
      data: [{ id: '1', name: 'Test' }],
      error: undefined,
      isLoading: false,
      isValidating: true,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.isValidating).toBe(true)
  })

  it('should handle large datasets', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      name: `Meeting Type ${i}`,
    }))

    mockUseSWR.mockReturnValue({
      data: largeData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    expect(result.current.data).toHaveLength(1000)
  })

  it('should handle revalidation', () => {
    const mockMutate = jest.fn()

    mockUseSWR.mockReturnValue({
      data: [{ id: '1', name: 'Test' }],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: mockMutate,
    } as any)

    const { result } = renderHook(() => useAllMeetingTypes())

    result.current.mutate()

    expect(mockMutate).toHaveBeenCalled()
  })
})
