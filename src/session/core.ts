import { NextPageContext } from 'next'
import { parse as parseCookie } from 'cookie'
import { Account } from '../types/Account'
import { AppContext } from 'next/app'

export const validateAuthentication = async (
  ctx: NextPageContext
): Promise<Account | null> => {
  const cookie = ctx.req?.headers.cookie
  let cookies: any = {}
  if (cookie) {
    cookies = parseCookie(cookie)
  }

  // if the user was authenticated, then we try to restore the authentication
  // without needing an action from user himself, given that we are in a serverless
  // context, we cannot store session state on the server side as of now...
  const authCookie = cookies['mww_auth']
  if (authCookie) {
    // Actually, we cannot check if the user owns the wallet or get any update on backend side,
    // this should be done
    if (!!ctx.req) {
      return typeof authCookie === 'string'
        ? JSON.parse(authCookie)
        : authCookie
    }

    // on the client side we force a check the first time the
    // page is loaded, so the user has to wait this process to
    // finish in order to validate its credentials
    // For more information, please see the _app.tsx::getInitialProps
  }

  return null
}

export const validateAuthenticationApp = async (
  app: AppContext
): Promise<Account | null> => {
  return validateAuthentication(app.ctx)
}
