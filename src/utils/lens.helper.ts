import { LensClient, production } from '@lens-protocol/client'

import handle from '@/pages/api/server/meetings'

const lensClient = new LensClient({
  environment: production,
})

export interface LensProfile {
  handle: string
  name?: string
  ownedBy: string
  picture?: string
}

const convertLensProfile = (profile: any): LensProfile => {
  return {
    handle: `${profile.handle.localName}.${profile.handle.namespace}`,
    name: profile.metadata?.displayName,
    ownedBy: profile.handle.ownedBy,
    picture: profile.metadata?.coverPicture?.optimized?.url,
  }
}

export const getLensHandlesForAddress = async (
  address: string
): Promise<LensProfile[] | undefined> => {
  try {
    const profiles = await lensClient.profile.fetchAll({
      where: { ownedBy: [address] },
    })

    return profiles.items.map(convertLensProfile)
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export const getLensProfile = async (
  handle: string
): Promise<LensProfile | undefined> => {
  try {
    const profiles = await lensClient.profile.fetchAll({
      where: { handles: [handle] },
    })

    return profiles.items.map(convertLensProfile)[0]
  } catch (e) {
    console.error(e)
  }

  return undefined
}
