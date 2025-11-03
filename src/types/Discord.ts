import { AuthToken } from './Account'

export interface DiscordAccount {
  access_token: AuthToken
  discord_id: string
  address: string
}

export interface DiscordUserInfo {
  id: string
  username: string
  global_name: string
  isInMWWServer?: boolean
}
export interface DiscordAccountInfo
  extends DiscordAccount,
    Partial<DiscordUserInfo> {}
