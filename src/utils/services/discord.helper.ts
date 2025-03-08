import * as Sentry from '@sentry/nextjs'
import { Client, Intents } from 'discord.js'

import { AuthToken } from '@/types/Account'

import {
  DiscordNotificationType,
  NotificationChannel,
} from '../../types/AccountNotifications'
import { DiscordUserInfo } from '../../types/DiscordUserInfo'
import { discordRedirectUrl, isProduction } from '../constants'
import {
  createOrUpdatesDiscordAccount,
  deleteDiscordAccount,
  getAccountNotificationSubscriptions,
  getDiscordAccount,
  setAccountNotificationSubscriptions,
} from '../database'

const client = new Client({ ws: { intents: [Intents.FLAGS.DIRECT_MESSAGES] } })
let ready = false

client.on('ready', () => {
  ready = true
  // eslint-disable-next-line no-restricted-syntax
  !isProduction && console.log(`Logged in as ${client.user?.tag}!`)
})

const doLogin = async () => {
  try {
    !ready && (await (client as Client).login(process.env.DISCORD_TOKEN))
  } catch (error) {
    Sentry.captureException(error)
  }
}

const MWW_DISCORD_SERVER_ID = '915252743529181224'

doLogin()

export const generateDiscordAuthToken = async (
  discordCode: string
): Promise<AuthToken | null> => {
  try {
    const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        code: discordCode,
        grant_type: 'authorization_code',
        redirect_uri: discordRedirectUrl,
        scope: 'identify,guilds',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const oauthData = await oauthResult.json()

    return {
      ...oauthData,
      created_at: new Date().getTime(),
    }
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
  }

  return null
}

export const getDiscordOAuthToken = async (
  accountAddress: string
): Promise<AuthToken | undefined> => {
  try {
    const discordAccount = await getDiscordAccount(accountAddress)

    if (!discordAccount) {
      throw new Error('Discord account not found')
    }

    if (
      discordAccount.access_token.created_at &&
      discordAccount.access_token.created_at +
        discordAccount.access_token.expires_in +
        60000 >
        new Date().getTime()
    ) {
      return discordAccount.access_token
    }

    return await refreshDiscordOAuthToken(
      accountAddress,
      discordAccount.discord_id,
      discordAccount.access_token.refresh_token
    )
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
  }
}

export const refreshDiscordOAuthToken = async (
  accountAddress: string,
  discordId: string,
  refreshToken: string
) => {
  try {
    const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (oauthResult.status === 401) {
      throw new Error('Unauthorized API call to Discord')
    }

    const oauthData = await oauthResult.json()

    if (!!oauthData.error) {
      throw new Error('Invalid grant')
    }

    const account = await createOrUpdatesDiscordAccount({
      access_token: { ...oauthData, created_at: new Date().getTime() },
      address: accountAddress,
      discord_id: discordId,
    })

    if (!account) {
      throw new Error('Could not create or update discord account')
    }

    return account.access_token
  } catch (e) {
    deleteDiscordAccount(accountAddress)
    console.error(e)
    Sentry.captureException(e)
  }
}

export const getDiscordInfoForAddress = async (
  address: string
): Promise<DiscordUserInfo | null> => {
  const token = await getDiscordOAuthToken(address)

  return getDiscordAccountInfo(token!)
}

export const getDiscordAccountInfo = async (
  discordAccessToken: AuthToken
): Promise<DiscordUserInfo | null> => {
  if (!ready) {
    await doLogin()
  }
  try {
    const userResult = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${discordAccessToken.token_type} ${discordAccessToken.access_token}`,
      },
    })

    if (userResult.status === 401) {
      Sentry.captureException('Discord API error')
      return null
    }

    const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        authorization: `${discordAccessToken.token_type} ${discordAccessToken.access_token}`,
      },
    })

    if (userGuilds.status === 401) {
      Sentry.captureException('Discord API error')
      return null
    }

    const user = await userResult.json()
    const guilds = await userGuilds.json()

    return {
      ...user,
      isInMWWServer: Array.isArray(guilds)
        ? !!guilds.find(
            (guild: { id: string }) => guild.id === MWW_DISCORD_SERVER_ID
          )
        : false,
    } as DiscordUserInfo
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
  }

  return null
}

export const dmAccount = async (
  accountAddress: string,
  discord_user_id: string,
  message: string
): Promise<boolean> => {
  if (!ready) {
    await doLogin()
  }
  try {
    const user = await client.users.fetch(discord_user_id)
    await user.send(message)
  } catch (error) {
    const notifications = await getAccountNotificationSubscriptions(
      accountAddress
    )

    const discordSubs = notifications.notification_types.find(
      notif => notif.channel === NotificationChannel.DISCORD
    ) as DiscordNotificationType | null

    if (discordSubs) {
      const token = await getDiscordOAuthToken(accountAddress)
      const accountInfo = await getDiscordAccountInfo(token!)
      discordSubs.inMWWServer = accountInfo!.isInMWWServer
      discordSubs.disabled = true
      await setAccountNotificationSubscriptions(accountAddress, notifications)
    }

    Sentry.captureException(error)
    return false
  }
  return true
}
