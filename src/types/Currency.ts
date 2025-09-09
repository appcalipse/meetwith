export interface PaikamaExchangeRateResponse {
  status_code: number
  data: {
    base: 'USD'
    target: string
    mid: number
    unit: 1
    timestamp: string
  }
}

export interface CurrencyConversion {
  success: boolean
  exchangeRate?: number
}

export interface ExchangeRateFallBack1Response {
  result: 'success'
  documentation: 'https://www.exchangerate-api.com/docs'
  terms_of_use: 'https://www.exchangerate-api.com/terms'
  time_last_update_unix: number
  time_last_update_utc: string
  time_next_update_unix: number
  time_next_update_utc: string
  base_code: 'USD'
  target_code: string
  conversion_rate: number
}

export interface ExchangeRateFallBack2Response {
  provider: 'https://www.exchangerate-api.com'
  WARNING_UPGRADE_TO_V6: 'https://www.exchangerate-api.com/docs/free'
  terms: 'https://www.exchangerate-api.com/terms'
  base: 'USD'
  date: string
  time_last_updated: number
  rates: {
    [x: string]: number
  }
}

export interface ExchangeRateFallBack3Response {
  date: string
  usd: {
    [x: string]: number
  }
}
