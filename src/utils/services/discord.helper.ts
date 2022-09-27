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
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
} from '../database'

const client = new Client({ ws: { intents: [Intents.FLAGS.DIRECT_MESSAGES] } })
let ready = false

client.on('ready', () => {
  ready = true
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
        client_id: process.env.DISCORD_CLIENT_ID!,
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
): Promise<AuthToken | null> => {
  const notifications = await getAccountNotificationSubscriptions(
    accountAddress
  )

  const discordSubs = notifications.notification_types.find(
    notif => notif.channel === NotificationChannel.DISCORD
  ) as DiscordNotificationType | null

  if (!discordSubs) return null

  if (
    discordSubs.accessToken.created_at &&
    !discordSubs.disabled &&
    discordSubs.accessToken.created_at + discordSubs.accessToken.expires_in <=
      new Date().getTime()
  ) {
    return discordSubs.accessToken
  }

  console.debug('Token expired, refreshing')

  const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: discordSubs.accessToken.refresh_token,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const oauthData = await oauthResult.json()

  return {
    ...oauthData,
    created_at: new Date(),
  }
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

    return {
      id: (await userResult.json()).id,
      isInMWWServer:
        ((await userGuilds.json()) || []).find(
          (guild: any) => guild.id === MWW_DISCORD_SERVER_ID
        ) !== null,
    }
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
      discordSubs.accessToken = token!
      await setAccountNotificationSubscriptions(accountAddress, notifications)
    }

    Sentry.captureException(error)
    return false
  }
  return true
}
