export interface AccountNotifications {
  account_address: string
  notification_types: NotificationType[]
}

export enum NotificationChannel {
  EMAIL = 'email',
  EPNS = 'epns',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
}

export interface NotificationType {
  channel: NotificationChannel
  destination: string
  disabled: boolean
}

export interface DiscordNotificationType extends NotificationType {
  inMWWServer?: boolean
}
