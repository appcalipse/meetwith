import {
  CurrencyConversion,
  ExchangeRateFallBack1Response,
  ExchangeRateFallBack2Response,
  ExchangeRateFallBack3Response,
  PaikamaExchangeRateResponse,
} from '@meta/Currency'

import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

export class CurrencyService {
  static BASE_API_URL = 'https://hexarate.paikama.co'
  static FALL_BACK_API_1 = 'https://v6.exchangerate-api.com'
  static FALL_BACK_API_2 = 'https://api.exchangerate-api.com'
  static FALL_BACK_API_3 =
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'

  private static async makeRequest<T>(url: string): Promise<{
    success: boolean
    data?: T
  }> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return { success: false }
      }
      const data: T = await response.json()
      return { data, success: true }
    } catch {
      return { success: false }
    }
  }

  static async getExchangeRateWithPaikama(
    currency: string
  ): Promise<CurrencyConversion> {
    const url = `${
      this.BASE_API_URL
    }/api/rates/latest/USD?target=${currency.toUpperCase()}`

    const { success, data } =
      await this.makeRequest<PaikamaExchangeRateResponse>(url)

    if (!success || !data) {
      return { success: false }
    }

    return {
      exchangeRate: data.data['mid'],
      success: true,
    }
  }

  static async getExchangeRateWithExchangeRateFallBack1(
    currency: string
  ): Promise<CurrencyConversion> {
    const url = `${this.FALL_BACK_API_1}/v6/${
      process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY
    }/pair/USD/${currency.toUpperCase()}`

    const { success, data } =
      await this.makeRequest<ExchangeRateFallBack1Response>(url)

    if (!success || !data) {
      return { success: false }
    }

    return {
      exchangeRate: data['conversion_rate'],
      success: true,
    }
  }

  static async getExchangeRateWithExchangeRateFallBack2(
    currency: string
  ): Promise<CurrencyConversion> {
    const url = `${this.FALL_BACK_API_2}/latest/USD`

    const { success, data } =
      await this.makeRequest<ExchangeRateFallBack2Response>(url)

    if (!success || !data) {
      return { success: false }
    }

    return {
      exchangeRate: data['rates'][currency.toUpperCase()],
      success: true,
    }
  }

  static async getExchangeRateWithExchangeRateFallBack3(
    currency: string
  ): Promise<CurrencyConversion> {
    const url = this.FALL_BACK_API_3

    const { success, data } =
      await this.makeRequest<ExchangeRateFallBack3Response>(url)

    if (!success || !data) {
      return { success: false }
    }

    return {
      exchangeRate: data['usd'][currency.toLowerCase()],
      success: true,
    }
  }

  static async getExchangeRate(currency: string): Promise<number> {
    const paikama = await this.getExchangeRateWithPaikama(currency)
    if (paikama.success && paikama.exchangeRate) {
      return paikama.exchangeRate
    }

    const fallBack1 =
      await this.getExchangeRateWithExchangeRateFallBack1(currency)
    if (fallBack1.success && fallBack1.exchangeRate) {
      return fallBack1.exchangeRate
    }

    const fallBack2 =
      await this.getExchangeRateWithExchangeRateFallBack2(currency)
    if (fallBack2.success && fallBack2.exchangeRate) {
      return fallBack2.exchangeRate
    }

    const fallBack3 =
      await this.getExchangeRateWithExchangeRateFallBack3(currency)
    if (fallBack3.success && fallBack3.exchangeRate) {
      return fallBack3.exchangeRate
    }

    throw new Error('Unable to get exchange rate')
  }

  static async getUnitPrice(currency: string): Promise<number> {
    return await queryClient.fetchQuery(
      QueryKeys.exchangeRate(currency),
      () => this.getExchangeRate(currency),
      {
        cacheTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 60 * 24,
      }
    )
  }

  static async getExchangeRateFromCurrency(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === 'USD') {
      return this.getExchangeRate(toCurrency)
    }

    if (toCurrency === 'USD') {
      const rate = await this.getExchangeRate(fromCurrency)
      return 1 / rate
    }

    const fromToUsd = await this.getExchangeRateFromCurrency(
      fromCurrency,
      'USD'
    )

    const usdToTarget = await this.getExchangeRate(toCurrency)

    return fromToUsd * usdToTarget
  }
}
