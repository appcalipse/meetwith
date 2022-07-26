import * as Sentry from '@sentry/node'

import { AuthToken } from '@/types/Account'

const POAP_API_URL = 'https://api.poap.tech'

export interface POAPEvent {
  id: number
  fancy_id: string
  name: string
  event_url: string
  image_url: string
  country: string
  city: string
  description: string
  year: number
  start_date: string //'DD-mmm-YYYY',
  end_date: string //'DD-mmm-YYYY',
  expiry_date: string //'DD-mmm-YYYY',
  supply: number
}
export interface POAP {
  event: POAPEvent
  tokenId: string
  owner: string
  chain: string
  created: string //'YYYY-MM-DD HH:mm:ss'
}

export const generatePOAPAuthToken = async (): Promise<AuthToken | null> => {
  try {
    const oauthResult = await fetch('https://poapauth.auth0.com/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: process.env.POAP_OAUTH_CLIENT_ID!,
        client_secret: process.env.POAP_OAUTH_CLIENT_SECRET!,
        audience: 'meet-with-wallet',
        grant_type: 'client_credentials',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const oauthData = await oauthResult.json()

    if (oauthData.error) {
      Sentry.captureException(oauthData)
      return null
    }
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

export const fetchWalletPOAPs = async (address: string): Promise<POAP[]> => {
  const response = await fetch(`${POAP_API_URL}/actions/scan/${address}`, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-API-Key': process.env.POAP_API_KEY!,
    },
  })
  if (response.status >= 200 && response.status < 300) {
    const poaps = await response.json()
    return poaps as POAP[]
  } else {
    Sentry.captureException(response)
  }

  return []
}

export const checkWalletHoldsPOAP = async (
  address: string,
  eventId: number
): Promise<POAP | null> => {
  const response = await fetch(
    `${POAP_API_URL}/actions/scan/${address}/${eventId}`,
    {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-API-Key': process.env.POAP_API_KEY!,
      },
    }
  )
  if (response.status >= 200 && response.status < 300) {
    const poap = await response.json()
    return poap as POAP
  } else if (response.status !== 404) {
    Sentry.captureException(response)
  }

  return null
}

export const getPOAPEventDetails = async (
  eventId: number
): Promise<POAPEvent | null> => {
  const response = await fetch(`${POAP_API_URL}/events/id/${eventId}`, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-API-Key': process.env.POAP_API_KEY!,
    },
  })
  if (response.status >= 200 && response.status < 300) {
    const event = await response.json()
    return event as POAPEvent
  } else {
    Sentry.captureException(response)
  }

  return null
}
