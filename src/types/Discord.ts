import { AuthToken } from './Account'

export interface DiscordAccount {
  access_token: AuthToken
  discord_id: number
  address: string
}
