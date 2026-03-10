import { DiscordAccountInfo } from '@meta/Discord'
import { TelegramAccountInfo } from '@meta/Telegram'

import { ActivePaymentAccount } from './PaymentAccount'

export enum ConnectedAccount {
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  STRIPE = 'stripe',
  GOOGLE_MEET = 'google-meet',
}

export interface ConnectedAccountInfo {
  account: ConnectedAccount
  info:
    | DiscordAccountInfo
    | TelegramAccountInfo
    | ActivePaymentAccount
    | { username?: string; [key: string]: unknown }
    | null
}
export interface StripeCountry {
  id: string
  name: string
}
