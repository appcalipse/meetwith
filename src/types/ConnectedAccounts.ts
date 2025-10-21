import { DiscordAccountInfo } from '@meta/Discord'
import { TelegramAccountInfo } from '@meta/Telegram'

export enum ConnectedAccount {
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  STRIPE = 'stripe',
}

export interface ConnectedAccountInfo {
  account: ConnectedAccount
  info: DiscordAccountInfo | TelegramAccountInfo | null
}
