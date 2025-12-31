export enum EditMode {
  MEETINGS = 'meetings',
  AVAILABILITY = 'availability',
  MEETING_SETTINGS = 'meeting-settings',
  GROUPS = 'groups',
  CONTACTS = 'contacts',
  DETAILS = 'details',
  TYPES = 'types',
  CALENDARS = 'calendars',
  NOTIFICATIONS = 'notifications',
  GATES = 'gates',
  WALLET = 'wallet',
  CLIENTBOARD = 'clientboard',
  QUICKPOLL = 'quickpoll',
  SIGNOUT = 'signout',
}

export enum Intents {
  JOIN = 'join',
  USE_COUPON = 'use-coupon',
  UPDATE_MEETING = 'update-meeting',
  CANCEL_MEETING = 'cancel-meeting',
  ACCEPT_CONTACT = 'accept-contact',
  DECLINE_CONTACT = 'decline-contact',
  SUBSCRIBE_PRO = 'subscribe-pro',
}

export enum InviteType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum SettingsSection {
  DETAILS = 'details',
  CONNECTED_CALENDARS = 'connected-calendars',
  CONNECTED_ACCOUNTS = 'connected-accounts',
  NOTIFICATIONS = 'notifications',
  SUBSCRIPTIONS = 'subscriptions',
  WALLET_PAYMENT = 'wallet-payment',
}
