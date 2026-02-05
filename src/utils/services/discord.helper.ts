/* eslint-disable no-restricted-syntax */
import { DiscordUserInfo } from '@meta/Discord'
import * as Sentry from '@sentry/nextjs'
import {
  Client,
  DiscordAPIError,
  DiscordjsError,
  DiscordjsErrorCodes,
  GatewayIntentBits,
} from 'discord.js'

import { AuthToken } from '@/types/Account'
import {
  DiscordNotificationType,
  NotificationChannel,
} from '@/types/AccountNotifications'

import { discordRedirectUrl, isProduction } from '../constants'
import {
  createOrUpdatesDiscordAccount,
  deleteDiscordAccount,
  getAccountNotificationSubscriptions,
  getDiscordAccount,
  setAccountNotificationSubscriptions,
} from '../database'

let ready = false
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
})

client.on('ready', () => {
  ready = true
  !isProduction && console.info(`Discord bot logged in as ${client.user?.tag}!`)
})

client.on('error', error => {
  console.error('Discord client error:', error)
  Sentry.captureException(error)
})
const doLogin = async () => {
  try {
    if (!ready) {
      !isProduction && console.info('Logging in to Discord...')
      await client.login(process.env.DISCORD_TOKEN)
    }
  } catch (error) {
    console.error('Discord login error:', error)
    Sentry.captureException(error)
  }
}
const MWW_DISCORD_SERVER_ID = '915252743529181224'

export const generateDiscordAuthToken = async (
  discordCode: string
): Promise<AuthToken | null> => {
  try {
    const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
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
      method: 'POST',
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
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
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
  if (!token) {
    return null
  }
  return getDiscordAccountInfo(token!)
}

export const getDiscordAccountInfo = async (
  discordAccessToken: AuthToken
): Promise<DiscordUserInfo | null> => {
  if (!client.isReady()) {
    await doLogin()
  }
  try {
    const userResult = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${discordAccessToken?.token_type} ${discordAccessToken.access_token}`,
      },
    })

    if (userResult.status === 401) {
      Sentry.captureException('Discord API error')
      return null
    }

    const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        authorization: `${discordAccessToken?.token_type} ${discordAccessToken.access_token}`,
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
  try {
    let attempts = 0
    const maxAttempts = 20 // 10 seconds total
    if (!client.isReady()) {
      doLogin()
    }
    while (!client.isReady() && attempts < maxAttempts) {
      console.info(`Waiting for Discord client... attempt ${attempts + 1}`)
      await new Promise(resolve => setTimeout(resolve, 1500))
      attempts++
    }

    if (!client.isReady()) {
      throw new Error('Discord client not ready after waiting')
    }

    console.info(
      `Discord client ready, attempting to send DM to user ${discord_user_id}`
    )
    console.info(`Attempting to send DM to user ${discord_user_id}`)

    const user = await client.users.fetch(discord_user_id)
    console.info(`User fetched: ${user.tag}`)

    const sentMessage = await user.send(message)
    console.info(`Message sent successfully: ${sentMessage.id}`)

    return true
  } catch (error: unknown) {
    let context
    if (error instanceof DiscordAPIError) {
      console.error('Discord DM Error:', {
        accountAddress,
        code: error.code,
        error: error.message,
        userId: discord_user_id,
      })

      // Handle specific Discord errors
      if (error.code === 50007) {
        console.error('Cannot send messages to this user (privacy settings)')
        context = 'Cannot send messages to this user (privacy settings)'
      } else if (error.code === 10013) {
        console.error('Unknown user')
        context = 'Unknown user'
      } else if (error.code === 50001) {
        console.error('Missing access')
        context = 'Missing access'
      }
    }
    const notifications =
      await getAccountNotificationSubscriptions(accountAddress)

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

    Sentry.captureException(error, {
      extra: {
        accountAddress,
        context,
        discord_user_id,
      },
    })
    return false
  }
}
