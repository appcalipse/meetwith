import { Auth, calendar_v3, google } from 'googleapis'

const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || ''

export class GoogleCalendarService {
  private url = ''
  private integrationName = ''
  // private auth: { getToken: () => Promise<MyGoogleAuth> };

  constructor(credential: Credential) {
    this.integrationName = 'google'
    // this.auth = this.googleAuth(credential);
  }

  private googleAuth = (credential: Credential) => {
    // const { client_secret, client_id, redirect_uris } = JSON.parse(GOOGLE_API_CREDENTIALS).web;
    // const myGoogleAuth = new MyGoogleAuth(client_id, client_secret, redirect_uris[0]);
    // const googleCredentials = credential.key as Auth.Credentials;
    // myGoogleAuth.setCredentials(googleCredentials);
    // const isExpired = () => myGoogleAuth.isTokenExpiring();
    // const refreshAccessToken = () =>
    //   myGoogleAuth
    //     .refreshToken(googleCredentials.refresh_token)
    //     .then((res: GetTokenResponse) => {
    //       const token = res.res?.data;
    //       googleCredentials.access_token = token.access_token;
    //       googleCredentials.expiry_date = token.expiry_date;
    //       return prisma.credential
    //         .update({
    //           where: {
    //             id: credential.id,
    //           },
    //           data: {
    //             key: googleCredentials as Prisma.InputJsonValue,
    //           },
    //         })
    //         .then(() => {
    //           myGoogleAuth.setCredentials(googleCredentials);
    //           return myGoogleAuth;
    //         });
    //     })
    //     .catch((err) => {
    //       this.log.error("Error refreshing google token", err);
    //       return myGoogleAuth;
    //     });
    // return {
    //   getToken: () => (!isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken()),
    // };
  }
}

class MyGoogleAuth extends google.auth.OAuth2 {
  constructor(client_id: string, client_secret: string, redirect_uri: string) {
    super(client_id, client_secret, redirect_uri)
  }

  isTokenExpiring() {
    return super.isTokenExpiring()
  }

  async refreshToken(token: string | null | undefined) {
    return super.refreshToken(token)
  }
}
