import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useCryptoBalances = (addresses: string[]) => {
  return useSWR(
    addresses.length > 0 ? '/api/crypto/balances' : null,
    null,
    { dedupingInterval: 5000 }
  )
}

describe('useCryptoBalances', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch balances when addresses provided', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoBalances(['0x123', '0x456']))
    expect(mockUseSWR).toHaveBeenCalledWith('/api/crypto/balances', null, expect.any(Object))
  })

  it('should not fetch when addresses empty', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false } as any)
    renderHook(() => useCryptoBalances([]))
    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })

  it('should return balances data', () => {
    const mockData = [
      { address: '0x123', balance: '1.5' },
      { address: '0x456', balance: '2.3' }
    ]
    mockUseSWR.mockReturnValue({ data: mockData, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoBalances(['0x123', '0x456']))
    expect(result.current.data).toEqual(mockData)
  })

  it('should handle single address', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoBalances(['0x123']))
    expect(mockUseSWR).toHaveBeenCalledWith('/api/crypto/balances', null, expect.any(Object))
  })

  it('should handle many addresses', () => {
    const addresses = Array.from({ length: 100 }, (_, i) => `0x${i}`)
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoBalances(addresses))
    expect(mockUseSWR).toHaveBeenCalled()
  })

  it('should use deduping interval', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoBalances(['0x123']))
    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.objectContaining({ dedupingInterval: 5000 })
    )
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Network error')
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoBalances(['0x123']))
    expect(result.current.error).toEqual(mockError)
  })

  it('should handle empty balances response', () => {
    mockUseSWR.mockReturnValue({ data: [], error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoBalances(['0x123']))
    expect(result.current.data).toEqual([])
  })

  it('should update when addresses change', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { rerender } = renderHook(
      ({ addresses }) => useCryptoBalances(addresses),
      { initialProps: { addresses: ['0x123'] } }
    )
    rerender({ addresses: ['0x456', '0x789'] })
    expect(mockUseSWR).toHaveBeenCalled()
  })

  it('should handle loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { result } = renderHook(() => useCryptoBalances(['0x123']))
    expect(result.current.isLoading).toBe(true)
  })
})
