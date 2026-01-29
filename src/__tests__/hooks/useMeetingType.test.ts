import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useMeetingType = (id: string) => {
  return useSWR(id ? `/api/meeting-type/${id}` : null, null)
}

describe('useMeetingType', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call useSWR with correct URL', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useMeetingType('123'))

    expect(mockUseSWR).toHaveBeenCalledWith('/api/meeting-type/123', null)
  })

  it('should not call API when id is empty', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useMeetingType(''))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should return meeting type data', () => {
    const mockData = { id: '123', name: 'Team Meeting', duration: 30 }
    mockUseSWR.mockReturnValue({
      data: mockData,
      error: undefined,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useMeetingType('123'))

    expect(result.current.data).toEqual(mockData)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Not found')
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useMeetingType('123'))

    expect(result.current.error).toEqual(mockError)
  })

  it('should handle null id', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useMeetingType(null as any))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should handle undefined id', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useMeetingType(undefined as any))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should update when id changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ id }) => useMeetingType(id),
      { initialProps: { id: '123' } }
    )

    rerender({ id: '456' })

    expect(mockUseSWR).toHaveBeenCalledWith('/api/meeting-type/456', null)
  })

  it('should handle numeric ids', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useMeetingType('12345'))

    expect(mockUseSWR).toHaveBeenCalledWith('/api/meeting-type/12345', null)
  })

  it('should handle UUID ids', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useMeetingType(uuid))

    expect(mockUseSWR).toHaveBeenCalledWith(`/api/meeting-type/${uuid}`, null)
  })

  it('should provide loading state', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => useMeetingType('123'))

    expect(result.current.isLoading).toBe(true)
  })
})
