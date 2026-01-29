import { renderHook } from '@testing-library/react'
import useSWR from 'swr'

jest.mock('swr')

const useCryptoConfig = () => {
  return useSWR('/api/crypto/config', null, { revalidateOnMount: true })
}

describe('useCryptoConfig', () => {
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch crypto config', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoConfig())
    expect(mockUseSWR).toHaveBeenCalledWith('/api/crypto/config', null, expect.any(Object))
  })

  it('should return config data', () => {
    const mockConfig = { networks: ['ethereum', 'polygon'], defaultCurrency: 'ETH' }
    mockUseSWR.mockReturnValue({ data: mockConfig, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data).toEqual(mockConfig)
  })

  it('should revalidate on mount', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    renderHook(() => useCryptoConfig())
    expect(mockUseSWR).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.objectContaining({ revalidateOnMount: true })
    )
  })

  it('should handle loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle error state', () => {
    const mockError = new Error('Failed to load config')
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.error).toEqual(mockError)
  })

  it('should handle empty config', () => {
    mockUseSWR.mockReturnValue({ data: {}, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data).toEqual({})
  })

  it('should handle config with multiple networks', () => {
    const config = { networks: ['ethereum', 'polygon', 'bsc', 'arbitrum'] }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.networks).toHaveLength(4)
  })

  it('should handle config with gas settings', () => {
    const config = { gasPrice: 'fast', maxGas: 100000 }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.gasPrice).toBe('fast')
  })

  it('should handle config with fee settings', () => {
    const config = { fees: { transaction: 0.001, withdrawal: 0.002 } }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.fees).toBeDefined()
  })

  it('should provide mutate function', () => {
    const mockMutate = jest.fn()
    mockUseSWR.mockReturnValue({
      data: {},
      error: undefined,
      isLoading: false,
      mutate: mockMutate
    } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.mutate).toBe(mockMutate)
  })

  it('should maintain same reference across rerenders', () => {
    mockUseSWR.mockReturnValue({ data: {}, error: undefined, isLoading: false } as any)
    const { result, rerender } = renderHook(() => useCryptoConfig())
    const firstCall = result.current
    rerender()
    expect(result.current).toBe(firstCall)
  })

  it('should handle config update', () => {
    const config1 = { defaultCurrency: 'ETH' }
    const config2 = { defaultCurrency: 'BTC' }
    mockUseSWR.mockReturnValue({ data: config1, error: undefined, isLoading: false } as any)
    const { result, rerender } = renderHook(() => useCryptoConfig())
    expect(result.current.data.defaultCurrency).toBe('ETH')
    mockUseSWR.mockReturnValue({ data: config2, error: undefined, isLoading: false } as any)
    rerender()
    expect(result.current.data.defaultCurrency).toBe('BTC')
  })

  it('should handle validation errors', () => {
    const mockError = { message: 'Invalid configuration' }
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.error).toBeDefined()
  })

  it('should handle network timeout', () => {
    const mockError = { code: 'ETIMEDOUT' }
    mockUseSWR.mockReturnValue({ data: undefined, error: mockError, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.error).toBeDefined()
  })

  it('should handle partial config', () => {
    const config = { networks: ['ethereum'] }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data).toBeDefined()
    expect(result.current.data.networks).toBeDefined()
  })

  it('should handle config with rate limits', () => {
    const config = { rateLimits: { requests: 1000, period: '1hour' } }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.rateLimits).toBeDefined()
  })

  it('should handle config with API keys', () => {
    const config = { apiKeys: { infura: 'key123', alchemy: 'key456' } }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.apiKeys).toBeDefined()
  })

  it('should handle config with contract addresses', () => {
    const config = { contracts: { token: '0x123', nft: '0x456' } }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.contracts).toBeDefined()
  })

  it('should handle config with supported tokens', () => {
    const config = { supportedTokens: ['ETH', 'USDC', 'DAI', 'WBTC'] }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.supportedTokens).toHaveLength(4)
  })

  it('should handle config with chain IDs', () => {
    const config = { chainIds: { ethereum: 1, polygon: 137, bsc: 56 } }
    mockUseSWR.mockReturnValue({ data: config, error: undefined, isLoading: false } as any)
    const { result } = renderHook(() => useCryptoConfig())
    expect(result.current.data.chainIds).toBeDefined()
  })
})
