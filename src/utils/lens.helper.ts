import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { gql } from '@apollo/client'

const initAppolloClient = () => {
  return new ApolloClient({
    link: new HttpLink({ uri: 'https://api.lens.dev/' }),
    cache: new InMemoryCache(),
  })
}

const GET_PROFILE = `
  query($request: SingleProfileQueryRequest!) {
    profile(request: $request) {
        id
        name
        picture {
          ... on NftImage {
            contractAddress
            tokenId
            uri
            verified
          }
          ... on MediaSet {
            original {
              url
              mimeType
            }
          }
          __typename
        }
        handle
        ownedBy
    }
  }
`

const GET_PROFILES = `
query($request: ProfileQueryRequest!) {
  profiles(request: $request) {
    items {
      id
      handle
      ownedBy
    }
  }
}
`

export interface LensProfile {
  handle: string
  name: string
  ownedBy: string
  id: string
  picture: {
    original: {
      url: string
    }
  }
}

const getLensHandlesForAddress = async (
  address: string
): Promise<LensProfile[] | undefined> => {
  try {
    const result = await initAppolloClient().query({
      query: gql(GET_PROFILES),
      variables: {
        request: {
          ownedBy: [address],
        },
      },
    })
    if (result.data?.profiles) {
      return result.data.profiles.items as LensProfile[]
    }
  } catch (e) {
    console.error(e)
  }

  return undefined
}

const getLensProfile = async (
  handle: string
): Promise<LensProfile | undefined> => {
  try {
    const response = await initAppolloClient().query({
      query: gql(GET_PROFILE),
      variables: {
        request: { handle },
      },
    })

    if (response.data?.profile) {
      return response.data.profile as LensProfile
    }
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export default {
  getLensHandlesForAddress,
  getLensProfile,
}
