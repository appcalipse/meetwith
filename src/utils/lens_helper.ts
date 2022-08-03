import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { gql } from '@apollo/client'

const httpLink = new HttpLink({ uri: 'https://api.lens.dev/' })

const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
})

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

export const getLensProfile = async (
  handle: string
): Promise<LensProfile | undefined> => {
  try {
    const response = await apolloClient.query({
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
