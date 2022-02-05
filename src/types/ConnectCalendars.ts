import { IconType } from 'react-icons'

export enum ProviderType {
  GOOGLE = 'Google',
  ICLOUD = 'iCloud',
  OUTLOOK = 'Outlook',
  OFFICE = 'Office 365',
}

export interface ConnectedCalendar {
  provider: ProviderType
  email: string
  icon: IconType
}
