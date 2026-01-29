import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useWalletBalance = (walletId: string) => {
  return useSWR(
    walletId ? `/api/wallet/${walletId}/balance` : null,
    null,
    { refreshInterval: 60000 }
  )
}

describe('useWalletBalance', () => {
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

    renderHook(() => useWalletBalance('wallet-123'))

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-123/balance',
      null,
      { refreshInterval: 60000 }
    )
  })

  it('should not call API when walletId is empty', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useWalletBalance(''))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })

  it('should return balance data', () => {
    const mockBalance = { balance: '100.50', currency: 'USD' }
    mockUseSWR.mockReturnValue({
      data: mockBalance,
      error: undefined,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useWalletBalance('wallet-123'))

    expect(result.current.data).toEqual(mockBalance)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Wallet not found')
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useWalletBalance('wallet-123'))

    expect(result.current.error).toEqual(mockError)
  })

  it('should refresh every 60 seconds', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useWalletBalance('wallet-123'))

    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.objectContaining({ refreshInterval: 60000 })
    )
  })

  it('should handle different wallet IDs', () => {
    const walletIds = ['wallet-1', 'wallet-2', 'wallet-abc']
    
    walletIds.forEach(id => {
      mockUseSWR.mockClear()
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      } as any)

      renderHook(() => useWalletBalance(id))

      expect(mockUseSWR).toHaveBeenCalledWith(
        `/api/wallet/${id}/balance`,
        null,
        expect.any(Object)
      )
    })
  })

  it('should update when walletId changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ id }) => useWalletBalance(id),
      { initialProps: { id: 'wallet-1' } }
    )

    rerender({ id: 'wallet-2' })

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/wallet/wallet-2/balance',
      null,
      expect.any(Object)
    )
  })

  it('should handle loading state', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => useWalletBalance('wallet-123'))

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle null walletId', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useWalletBalance(null as any))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })

  it('should handle undefined walletId', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useWalletBalance(undefined as any))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })
})
