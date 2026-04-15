import { MeetingProvider } from '@/types/Meeting'
import { addOrUpdateMeetingProvider } from '@/utils/database'
import { encodeServerKeys } from '@/utils/zoom.helper'

export const refreshUserAccessToken = async (
  accountAddress: string,
  email: string,
  refreshToken: string
) => {
  const client_id = process.env.ZOOM_CLIENT_ID
  const client_secret = process.env.ZOOM_CLIENT_SECRET
  if (!client_id || !client_secret) {
    throw new Error('Missing Zoom client credentials')
  }

  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeServerKeys(client_id, client_secret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to refresh user zoom token: ${tokenResponse.statusText}`
    )
  }

  const tokens = await tokenResponse.json()
  tokens.expires_at = Date.now() + tokens.expires_in * 1000

  await addOrUpdateMeetingProvider(
    accountAddress,
    email,
    MeetingProvider.ZOOM,
    tokens as unknown as Record<string, unknown>
  )

  return tokens
}
