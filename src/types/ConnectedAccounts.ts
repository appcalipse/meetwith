import { DiscordAccountInfo } from '@meta/Discord'
import { TelegramAccountInfo } from '@meta/Telegram'

import { ActivePaymentAccount } from './PaymentAccount'

export enum ConnectedAccount {
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  STRIPE = 'stripe',
}

export interface ConnectedAccountInfo {
  account: ConnectedAccount
  info: DiscordAccountInfo | TelegramAccountInfo | ActivePaymentAccount | null
}
export interface StripeCountry {
  id: string
  name: string
}
