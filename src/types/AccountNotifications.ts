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

export enum VerificationChannel {
  TRANSACTION_PIN = 'transaction-pin',
  RESET_EMAIL = 'reset-email',
}

export interface Verification {
  id: string
  owner_account_address: string
  expires_at: Date
  created_at: Date
  code_hash: string
  channel: VerificationChannel
}
