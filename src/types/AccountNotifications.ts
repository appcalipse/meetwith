export interface AccountNotifications {
  account_address: string
  notification_types: NotificationType[]
}

export enum NotificationChannel {
  EMAIL = 'email',
  EPNS = 'epns',
  BROWSER_PUSH = 'browser_push',
}

export interface NotificationType {
  channel: NotificationChannel
  destination: string
}
