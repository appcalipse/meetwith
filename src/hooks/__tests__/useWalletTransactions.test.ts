import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useWalletTransactions = (walletId: string, limit = 10) => {
  return useSWR(
    walletId ? `/api/wallet/${walletId}/transactions?limit=${limit}` : null,
    null
  )
}

describe('useWalletTransactions', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call useSWR with correct URL and default limit', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useWalletTransactions('wallet-123'))

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-123/transactions?limit=10',
      null
    )
  })

  it('should call useSWR with custom limit', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useWalletTransactions('wallet-123', 25))

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-123/transactions?limit=25',
      null
    )
  })

  it('should not call API when walletId is empty', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useWalletTransactions(''))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null)
  })

  it('should return transactions data', () => {
    const mockTransactions = [
      { id: '1', amount: 100, date: '2024-01-01' },
      { id: '2', amount: -50, date: '2024-01-02' },
    ]
    mockUseSWR.mockReturnValue({
      data: mockTransactions,
      error: undefined,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useWalletTransactions('wallet-123'))

    expect(result.current.data).toEqual(mockTransactions)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Failed to fetch')
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useWalletTransactions('wallet-123'))

    expect(result.current.error).toEqual(mockError)
  })

  it('should handle empty transactions array', () => {
    mockUseSWR.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useWalletTransactions('wallet-123'))

    expect(result.current.data).toEqual([])
  })

  it('should update when walletId changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ id }) => useWalletTransactions(id),
      { initialProps: { id: 'wallet-1' } }
    )

    rerender({ id: 'wallet-2' })

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-2/transactions?limit=10',
      null
    )
  })

  it('should update when limit changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ limit }) => useWalletTransactions('wallet-123', limit),
      { initialProps: { limit: 10 } }
    )

    rerender({ limit: 50 })

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-123/transactions?limit=50',
      null
    )
  })

  it('should handle large limit values', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useWalletTransactions('wallet-123', 1000))

    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.stringContaining('limit=1000'),
      null
    )
  })

  it('should handle zero limit', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useWalletTransactions('wallet-123', 0))

    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.stringContaining('limit=0'),
      null
    )
  })
})
