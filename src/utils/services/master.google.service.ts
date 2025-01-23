import { SpacesServiceClient } from '@google-apps/meet'
import { google } from '@google-apps/meet/build/protos/protos'
import { readFile, writeFile } from 'fs/promises'
import { auth, OAuth2Client } from 'google-auth-library'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
import path from 'path'
import process from 'process'

const TOKEN_PATH = path.join(process.cwd(), 'google-master-token.json')
export const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')
async function loadSavedCredentialsIfExist(): Promise<
  JSONClient | OAuth2Client | null
> {
  try {
    const content = (await readFile(TOKEN_PATH)).toString('utf8')
    const credentials = JSON.parse(content)
    return auth.fromJSON(credentials)
  } catch (err) {
    return null
  }
}

async function saveCredentials(client: OAuth2Client): Promise<void> {
  const content = (await readFile(CREDENTIALS_PATH)).toString('utf8')
  const keys = JSON.parse(content)
  const key = keys.installed || keys.web
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  })
  await writeFile(TOKEN_PATH, payload)
}

async function authorize() {
  const client = await loadSavedCredentialsIfExist()
  if (client) {
    return client
  } else {
    throw new Error('No credentials found')
  }
}

async function createSpace(): Promise<string | undefined | null> {
  const authClient = await authorize()
  const meetClient = new SpacesServiceClient({
    authClient: authClient as JSONClient,
  })
  const request: google.apps.meet.v2.ICreateSpaceRequest = {
    space: {
      config: {
        accessType: 'OPEN',
      },
    },
  }
  const response = await meetClient.createSpace(request)
  return response[0].meetingUri
}

export { authorize, createSpace, saveCredentials }
