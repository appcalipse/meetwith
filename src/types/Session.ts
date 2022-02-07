import { Account } from './Account'

export interface AccountSession extends Account {
  signature: string
}
