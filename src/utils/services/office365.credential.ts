import { AccessToken, TokenCredential } from '@azure/identity'

import { officeScopes } from '@/pages/api/secure/calendar_integrations/office365/connect'

export type O365AuthCredentials = {
  expiry_date: number
  access_token: string
  refresh_token: string
}

export class RefreshTokenCredential implements TokenCredential {
  private accessToken: string
  private expiryDate: number
  private refreshToken: string
  private clientId: string
  private clientSecret: string
  private onTokenRefresh: (token: string, expiry: number) => Promise<void>
  private refreshPromise: Promise<AccessToken> | null = null

  constructor(
    credential: O365AuthCredentials,
    clientId: string,
    clientSecret: string,
    onTokenRefresh: (token: string, expiry: number) => Promise<void>
  ) {
    this.accessToken = credential.access_token
    this.expiryDate = credential.expiry_date
    this.refreshToken = credential.refresh_token
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.onTokenRefresh = onTokenRefresh
  }

  async getToken(): Promise<AccessToken> {
    if (!this.isExpired()) {
      return {
        expiresOnTimestamp: this.expiryDate * 1000,
        token: this.accessToken,
      }
    }

    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.refreshTokenInternal()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async refreshTokenInternal(): Promise<AccessToken> {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          scope: officeScopes.join(' '),
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (
      !data.access_token ||
      typeof data.access_token !== 'string' ||
      data.access_token.length === 0
    ) {
      throw new Error('Token refresh response missing or invalid access_token')
    }

    this.accessToken = data.access_token
    this.expiryDate = Math.round(Date.now() / 1000 + data.expires_in)

    await this.onTokenRefresh(this.accessToken, this.expiryDate)

    return {
      expiresOnTimestamp: this.expiryDate * 1000,
      token: this.accessToken,
    }
  }

  private isExpired(): boolean {
    return this.expiryDate < Math.round((Date.now() - 60000) / 1000)
  }
}
