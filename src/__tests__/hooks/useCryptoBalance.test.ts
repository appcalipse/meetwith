import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useCryptoBalance = (address: string, currency: string) => {
  return useSWR(
    address && currency ? `/api/crypto/balance?address=${address}&currency=${currency}` : null,
    null,
    { refreshInterval: 30000 }
  )
}

describe('useCryptoBalance', () => {
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

    renderHook(() => useCryptoBalance('0x123', 'ETH'))

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/crypto/balance?address=0x123&currency=ETH',
      null,
      { refreshInterval: 30000 }
    )
  })

  it('should not call API when address is missing', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useCryptoBalance('', 'ETH'))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })

  it('should not call API when currency is missing', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as any)

    renderHook(() => useCryptoBalance('0x123', ''))

    expect(mockUseSWR).toHaveBeenCalledWith(null, null, expect.any(Object))
  })

  it('should return balance data', () => {
    const mockBalance = { balance: '1.5', currency: 'ETH' }
    mockUseSWR.mockReturnValue({
      data: mockBalance,
      error: undefined,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useCryptoBalance('0x123', 'ETH'))

    expect(result.current.data).toEqual(mockBalance)
  })

  it('should return error when fetch fails', () => {
    const mockError = new Error('Network error')
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useCryptoBalance('0x123', 'ETH'))

    expect(result.current.error).toEqual(mockError)
  })

  it('should refresh every 30 seconds', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    renderHook(() => useCryptoBalance('0x123', 'ETH'))

    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.objectContaining({ refreshInterval: 30000 })
    )
  })

  it('should handle different currencies', () => {
    const currencies = ['ETH', 'BTC', 'USDC', 'DAI']
    
    currencies.forEach(currency => {
      mockUseSWR.mockClear()
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      } as any)

      renderHook(() => useCryptoBalance('0x123', currency))

      expect(mockUseSWR).toHaveBeenCalledWith(
        `/api/crypto/balance?address=0x123&currency=${currency}`,
        null,
        expect.any(Object)
      )
    })
  })

  it('should handle different address formats', () => {
    const addresses = ['0x123', '0xABC', '0x1234567890abcdef']
    
    addresses.forEach(address => {
      mockUseSWR.mockClear()
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      } as any)

      renderHook(() => useCryptoBalance(address, 'ETH'))

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.stringContaining(address),
        null,
        expect.any(Object)
      )
    })
  })

  it('should update when address changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ address, currency }) => useCryptoBalance(address, currency),
      { initialProps: { address: '0x123', currency: 'ETH' } }
    )

    rerender({ address: '0x456', currency: 'ETH' })

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/crypto/balance?address=0x456&currency=ETH',
      null,
      expect.any(Object)
    )
  })

  it('should update when currency changes', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any)

    const { rerender } = renderHook(
      ({ address, currency }) => useCryptoBalance(address, currency),
      { initialProps: { address: '0x123', currency: 'ETH' } }
    )

    rerender({ address: '0x123', currency: 'BTC' })

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/crypto/balance?address=0x123&currency=BTC',
      null,
      expect.any(Object)
    )
  })
})
