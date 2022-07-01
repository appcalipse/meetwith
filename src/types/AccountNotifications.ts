import { AuthToken } from './Account'

export interface AccountNotifications {
  account_address: string
  notification_types: NotificationType[]
}

export enum NotificationChannel {
  EMAIL = 'email',
  EPNS = 'epns',
  DISCORD = 'discord',
}

export interface NotificationType {
  channel: NotificationChannel
  destination: string
  disabled: boolean
}

export interface DiscordNotificationType extends NotificationType {
  accessToken: AuthToken
  inMWWServer: boolean
}
