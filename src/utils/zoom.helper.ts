import { promises } from 'fs'
import path from 'path'

import { Credentials } from '@/types/Zoom'
export const ZOOM_API_URL = 'https://api.zoom.us/v2'
export const ZOOM_AUTH_URL = 'https://zoom.us/oauth/token'
const TOKEN_PATH = path.join(process.cwd(), 'zoom-token.json')
export const getAccessToken = async () => {
  const content = await promises.readFile(TOKEN_PATH, {
    encoding: 'utf-8',
  })
  const credentials = JSON.parse(content)
  if (credentials.expires_at > Date.now()) {
    return credentials.access_token
  } else {
    // refresh token expires in 90 days
    return refreshAccessToken(credentials.refresh_token)
  }
}
const ONE_HOUR_IN_MILLI_SECONDS = 3_600_000
export const saveCredentials = async (credentials: Credentials) => {
  await promises.writeFile(
    TOKEN_PATH,
    JSON.stringify({
      ...credentials,
      expires_at: Date.now() + ONE_HOUR_IN_MILLI_SECONDS - 100_000,
    })
  )
}

export const refreshAccessToken = async (refresh_token: string) => {
  const myHeaders = new Headers()
  myHeaders.append(
    'Authorization',
    `Basic ${encodeServerKeys(
      process.env.ZOOM_CLIENT_ID!,
      process.env.ZOOM_CLIENT_SECRET!
    )}`
  )

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
  }

  const zoomResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${refresh_token}`,
    requestOptions
  )
  const zoomToken: Credentials = await zoomResponse.json()
  await saveCredentials(zoomToken)
  return zoomToken.access_token
}

export const encodeServerKeys = (key: string, secret: string) => {
  return Buffer.from(`${key}:${secret}`).toString('base64')
}
