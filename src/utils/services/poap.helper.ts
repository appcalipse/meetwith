import * as Sentry from '@sentry/node'

const POAP_API_URL = 'https://api.poap.tech'

export interface POAP {
  event: {
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
  tokenId: string
  owner: string
  chain: string
  created: string //'YYYY-MM-DD HH:mm:ss'
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
    Sentry.captureException(response.statusText)
  }

  return []
}

export const checkWalletHoldsEventPOAP = async (
  address: string,
  eventId: number
): Promise<POAP[]> => {
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
    const poaps = await response.json()
    return poaps as POAP[]
  } else {
    Sentry.captureException(response.statusText)
  }

  return []
}
