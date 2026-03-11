import {
  CurrencyConversion,
  ExchangeRateFallBack1Response,
  ExchangeRateFallBack2Response,
  ExchangeRateFallBack3Response,
  PaikamaExchangeRateResponse,
} from '@meta/Currency'

import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { CurrencyService } from '@/utils/services/currency.service'

jest.mock('@/utils/react_query', () => ({
  queryClient: {
    fetchQuery: jest.fn(),
  },
}))

describe('CurrencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getExchangeRateWithPaikama', () => {
    it('should fetch exchange rate from Paikama API', async () => {
      const mockResponse: PaikamaExchangeRateResponse = {
        data: {
          mid: 1.25,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result = await CurrencyService.getExchangeRateWithPaikama('EUR')

      expect(global.fetch).toHaveBeenCalledWith(
        `${CurrencyService.BASE_API_URL}/api/rates/latest/USD?target=EUR`
      )
      expect(result).toEqual({
        exchangeRate: 1.25,
        success: true,
      })
    })

    it('should handle lowercase currency', async () => {
      const mockResponse: PaikamaExchangeRateResponse = {
        data: {
          mid: 1.1,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      await CurrencyService.getExchangeRateWithPaikama('eur')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('target=EUR')
      )
    })

    it('should return failure on fetch error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await CurrencyService.getExchangeRateWithPaikama('EUR')

      expect(result).toEqual({ success: false })
    })

    it('should return failure on non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      const result = await CurrencyService.getExchangeRateWithPaikama('EUR')

      expect(result).toEqual({ success: false })
    })
  })

  describe('getExchangeRateWithExchangeRateFallBack1', () => {
    it('should fetch from fallback API 1', async () => {
      const mockResponse: ExchangeRateFallBack1Response = {
        conversion_rate: 1.3,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack1('GBP')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `${CurrencyService.FALL_BACK_API_1}/v6/${process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY}/pair/USD/GBP`
        )
      )
      expect(result).toEqual({
        exchangeRate: 1.3,
        success: true,
      })
    })

    it('should return failure on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack1('GBP')

      expect(result).toEqual({ success: false })
    })
  })

  describe('getExchangeRateWithExchangeRateFallBack2', () => {
    it('should fetch from fallback API 2', async () => {
      const mockResponse: ExchangeRateFallBack2Response = {
        rates: {
          CAD: 1.35,
          EUR: 1.1,
          GBP: 0.8,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack2('CAD')

      expect(global.fetch).toHaveBeenCalledWith(
        `${CurrencyService.FALL_BACK_API_2}/latest/USD`
      )
      expect(result).toEqual({
        exchangeRate: 1.35,
        success: true,
      })
    })

    it('should handle uppercase currency', async () => {
      const mockResponse: ExchangeRateFallBack2Response = {
        rates: {
          EUR: 1.1,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack2('eur')

      expect(result).toEqual({
        exchangeRate: 1.1,
        success: true,
      })
    })

    it('should return failure on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack2('EUR')

      expect(result).toEqual({ success: false })
    })
  })

  describe('getExchangeRateWithExchangeRateFallBack3', () => {
    it('should fetch from fallback API 3', async () => {
      const mockResponse: ExchangeRateFallBack3Response = {
        usd: {
          aud: 1.5,
          eur: 1.1,
          gbp: 0.8,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack3('AUD')

      expect(global.fetch).toHaveBeenCalledWith(CurrencyService.FALL_BACK_API_3)
      expect(result).toEqual({
        exchangeRate: 1.5,
        success: true,
      })
    })

    it('should handle lowercase currency', async () => {
      const mockResponse: ExchangeRateFallBack3Response = {
        usd: {
          jpy: 150,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        ok: true,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack3('JPY')

      expect(result).toEqual({
        exchangeRate: 150,
        success: true,
      })
    })

    it('should return failure on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      const result =
        await CurrencyService.getExchangeRateWithExchangeRateFallBack3('JPY')

      expect(result).toEqual({ success: false })
    })
  })

  describe('getExchangeRate', () => {
    it('should return Paikama rate if successful', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          data: { mid: 1.2 },
        }),
        ok: true,
      })

      const result = await CurrencyService.getExchangeRate('EUR')

      expect(result).toBe(1.2)
    })

    it('should fallback to API 1 if Paikama fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            conversion_rate: 1.3,
          }),
          ok: true,
        })

      const result = await CurrencyService.getExchangeRate('EUR')

      expect(result).toBe(1.3)
    })

    it('should fallback to API 2 if API 1 fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            rates: { EUR: 1.4 },
          }),
          ok: true,
        })

      const result = await CurrencyService.getExchangeRate('EUR')

      expect(result).toBe(1.4)
    })

    it('should fallback to API 3 if API 2 fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            usd: { eur: 1.5 },
          }),
          ok: true,
        })

      const result = await CurrencyService.getExchangeRate('EUR')

      expect(result).toBe(1.5)
    })

    it('should throw error if all APIs fail', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })

      await expect(CurrencyService.getExchangeRate('EUR')).rejects.toThrow(
        'Unable to get exchange rate'
      )
    })
  })

  describe('getUnitPrice', () => {
    it('should use query client to fetch and cache exchange rate', async () => {
      const mockRate = 1.25
      ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue(mockRate)

      const result = await CurrencyService.getUnitPrice('EUR')

      expect(queryClient.fetchQuery).toHaveBeenCalledWith(
        QueryKeys.exchangeRate('EUR'),
        expect.any(Function),
        {
          cacheTime: 1000 * 60 * 60 * 24,
          staleTime: 1000 * 60 * 60 * 24,
        }
      )
      expect(result).toBe(mockRate)
    })

    it('should execute the query function', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          data: { mid: 1.3 },
        }),
        ok: true,
      })

      let queryFunction: (() => Promise<number>) | undefined

      ;(queryClient.fetchQuery as jest.Mock).mockImplementation(
        async (key, fn) => {
          queryFunction = fn
          return fn()
        }
      )

      const result = await CurrencyService.getUnitPrice('GBP')

      expect(queryFunction).toBeDefined()
      expect(result).toBe(1.3)
    })
  })

  describe('getExchangeRateFromCurrency', () => {
    beforeEach(() => {
      jest
        .spyOn(CurrencyService, 'getExchangeRate')
        .mockResolvedValue(1.2)
    })

    it('should return exchange rate when fromCurrency is USD', async () => {
      const result = await CurrencyService.getExchangeRateFromCurrency(
        'USD',
        'EUR'
      )

      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('EUR')
      expect(result).toBe(1.2)
    })

    it('should return inverse rate when toCurrency is USD', async () => {
      jest
        .spyOn(CurrencyService, 'getExchangeRate')
        .mockResolvedValue(1.5)

      const result = await CurrencyService.getExchangeRateFromCurrency(
        'EUR',
        'USD'
      )

      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('EUR')
      expect(result).toBeCloseTo(1 / 1.5, 5)
    })

    it('should calculate cross-currency rate', async () => {
      const originalMethod = CurrencyService.getExchangeRateFromCurrency.bind(CurrencyService)
      
      jest
        .spyOn(CurrencyService, 'getExchangeRate')
        .mockResolvedValueOnce(2) // EUR to USD
        .mockResolvedValueOnce(1.5) // USD to GBP

      const result = await originalMethod('EUR', 'GBP')

      expect(result).toBe(0.5 * 1.5)
    })

    it('should handle same currency conversion', async () => {
      const result = await CurrencyService.getExchangeRateFromCurrency(
        'USD',
        'USD'
      )

      expect(CurrencyService.getExchangeRate).toHaveBeenCalledWith('USD')
    })
  })

  describe('API URL constants', () => {
    it('should have correct API URLs', () => {
      expect(CurrencyService.BASE_API_URL).toBe('https://hexarate.paikama.co')
      expect(CurrencyService.FALL_BACK_API_1).toBe(
        'https://v6.exchangerate-api.com'
      )
      expect(CurrencyService.FALL_BACK_API_2).toBe(
        'https://api.exchangerate-api.com'
      )
      expect(CurrencyService.FALL_BACK_API_3).toBe(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
      )
    })
  })

  describe('Error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        ok: true,
      })

      const result = await CurrencyService.getExchangeRateWithPaikama('EUR')

      expect(result).toEqual({ success: false })
    })

    it('should handle network timeouts', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      )

      const result = await CurrencyService.getExchangeRateWithPaikama('EUR')

      expect(result).toEqual({ success: false })
    })
  })
})
