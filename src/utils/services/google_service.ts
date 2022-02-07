// import * as Sentry from '@sentry/browser'
// import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
// import { Auth } from 'googleapis'

// import { ConnectedCalendarProvider } from '../../types/CalendarConnections'
// import { MWWGoogleAuth } from './google_auth'

// export interface Calendar {}

// export default class GoogleCalendarService implements Calendar {
//   private url = ''
//   private integrationName = ''
//   private auth: { getToken: () => Promise<MWWGoogleAuth> }

//   constructor(credential: Credential) {
//     this.integrationName = ConnectedCalendarProvider.GOOGLE
//     this.auth = this.googleAuth(credential)
//   }

//   private googleAuth = (credential: Credential) => {
//     const [client_secret, client_id] = [
//       process.env.GOOGLE_CLIENT_ID!,
//       process.env.GOOGLE_CLIENT_ID!,
//     ]

//     const myGoogleAuth = new MWWGoogleAuth(client_id, client_secret)

//     const googleCredentials = {} as Auth.Credentials//credential.key as Auth.Credentials
//     myGoogleAuth.setCredentials(googleCredentials)

//     const isExpired = () => myGoogleAuth.isTokenExpiring()

//     const refreshAccessToken = () =>
//       myGoogleAuth
//         .refreshToken(googleCredentials.refresh_token)
//         .then((res: GetTokenResponse) => {
//           const token = res.res?.data
//           googleCredentials.access_token = token.access_token
//           googleCredentials.expiry_date = token.expiry_date

//           return prisma.credential
//             .update({
//               where: {
//                 id: credential.id,
//               },
//               data: {
//                 key: googleCredentials as Prisma.InputJsonValue,
//               },
//             })
//             .then(() => {
//               myGoogleAuth.setCredentials(googleCredentials)
//               return myGoogleAuth
//             })
//         })
//         .catch(err => {
//           Sentry.captureException(err)

//           return myGoogleAuth
//         })

//     return {
//       getToken: () =>
//         !isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken(),
//     }
//   }
// }
