import { getSupportedChainFromId, getTokenFromName } from '@meta/chains'

export const getOnrampMoneyTokenAddress = async (
  coinId: number,
  chainId: number
): Promise<string | null> => {
  const response = await fetch(
    'https://api.onramp.money/onramp/api/v2/sell/public/allConfig'
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch token name: ${response.statusText}`)
  }

  const data = await response.json()
  const coinConfig = data.data.allCoinConfig as {
    [x: string]: {
      coinId: number
      networks: number[]
      coinName: string
      coinIcon: string
      balanceFloatPlaces: number
      tradeFloatPlaces: number
    }
  }
  const coin = Object.values(coinConfig).find(
    c => c.coinId === coinId && c.networks.push(chainId)
  )
  if (!coin) {
    return null
  }
  const tokenEnum = getTokenFromName(coin.coinName)
  if (!tokenEnum) {
    return null
  }
  const chain = getSupportedChainFromId(chainId)
  if (!chain) {
    return null
  }
  const token = chain.acceptableTokens.find(token => token.token === tokenEnum)
  if (!token) {
    return null
  }

  return token.contractAddress
}
export enum Currency {
  INR = 'INR',
  TRY = 'TRY',
  AED = 'AED',
  MXN = 'MXN',
  VND = 'VND',
  NGN = 'NGN',
  BRL = 'BRL',
  PEN = 'PEN',
  COP = 'COP',
  CLP = 'CLP',
  PHP = 'PHP',
  EUR = 'EUR',
  IDR = 'IDR',
  KES = 'KES',
  GHS = 'GHS',
  RAND = 'RAND',
  RWF = 'RWF',
  XAF = 'XAF',
  GBP = 'GBP',
  USD = 'USD',
  BWP = 'BWP',
  MWK = 'MWK',
  TZS = 'TZS',
  UGX = 'UGX',
  ZMW = 'ZMW',
  THB = 'THB',
  MYR = 'MYR',
  ARS = 'ARS',
  AUD = 'AUD',
  EGP = 'EGP',
  LKR = 'LKR',
  PLN = 'PLN',
  TWN = 'TWN',
  SGD = 'SGD',
  NZD = 'NZD',
  JPY = 'JPY',
  KRW = 'KRW',
  XOF = 'XOF',
  CDF = 'CDF',
  GAB = 'GAB',
  COG = 'COG',
  PYG = 'PYG',
  UYU = 'UYU',
  CRC = 'CRC',
  GTQ = 'GTQ',
  CAD = 'CAD',
  BOB = 'BOB',
  VES = 'VES',
}
export const currenciesMap: Record<number, Currency> = {
  1: Currency.INR,
  2: Currency.TRY,
  3: Currency.AED,
  4: Currency.MXN,
  5: Currency.VND,
  6: Currency.NGN,
  7: Currency.BRL,
  8: Currency.PEN,
  9: Currency.COP,
  10: Currency.CLP,
  11: Currency.PHP,
  12: Currency.EUR,
  14: Currency.IDR,
  15: Currency.KES,
  16: Currency.GHS,
  17: Currency.RAND,
  18: Currency.RWF,
  19: Currency.XAF,
  20: Currency.GBP,
  21: Currency.USD,
  22: Currency.BWP,
  23: Currency.MWK,
  24: Currency.TZS,
  25: Currency.UGX,
  26: Currency.ZMW,
  27: Currency.THB,
  28: Currency.MYR,
  29: Currency.ARS,
  30: Currency.AUD,
  31: Currency.EGP,
  32: Currency.LKR,
  33: Currency.PLN,
  34: Currency.TWN,
  35: Currency.SGD,
  36: Currency.NZD,
  37: Currency.JPY,
  38: Currency.KRW,
  39: Currency.XOF,
  40: Currency.CDF,
  41: Currency.GAB,
  42: Currency.COG,
  43: Currency.USD,
  44: Currency.PYG,
  45: Currency.UYU,
  46: Currency.USD,
  47: Currency.CRC,
  48: Currency.GTQ,
  49: Currency.USD,
  50: Currency.CAD,
  51: Currency.BOB,
  52: Currency.VES,
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Converts OnRamp webhook status codes to PaymentStatus enum values
 * @param status - The numeric status code from OnRamp webhook
 * @returns PaymentStatus enum value
 */
export function extractOnRampStatus(status: number): PaymentStatus {
  switch (status) {
    // Failed statuses
    case -4: // wrong amount sent
    case -1: // transaction timed out
    case 3: // funds withheld pending manual review (KYC limit exceeded)
      return PaymentStatus.FAILED

    // Cancelled status
    case -2: // transaction abandoned
      return PaymentStatus.CANCELLED

    // Completed statuses
    case 6: // fiat withdrawal process complete
    case 7: // webhook notification sent
    case 14: // fiat withdrawal process complete
    case 15: // webhook notification sent
    case 19: // fiat processed and transaction successfully completed
    case 40: // fiat withdrawal process complete
    case 41: // webhook notification sent
      return PaymentStatus.COMPLETED

    // Pending statuses (all in-progress states)
    case 0: // transaction created
    case 1: // referenceId claimed
    case 2: // deposit secured
    case 4: // cryptocurrency has been sold
    case 5: // fiat withdrawal process started
    case 10: // deposit secured
    case 11: // deposit secured
    case 12: // cryptocurrency has been sold
    case 13: // fiat withdrawal process started
    case 17: // option to provide alternate bank account
    case 18: // processing to alternate bank account
    case 30: // fiat withdrawal process started
    case 31: // fiat withdrawal process started
    case 32: // fiat withdrawal process started
    case 33: // fiat withdrawal process started
    case 34: // fiat withdrawal process started
    case 35: // fiat withdrawal process started
    case 36: // fiat withdrawal process started
      return PaymentStatus.PENDING

    // Default to pending for unknown status codes
    default:
      console.warn(
        `Unknown OnRamp status code: ${status}. Defaulting to PENDING.`
      )
      return PaymentStatus.PENDING
  }
}
