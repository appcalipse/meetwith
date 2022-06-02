import { withIronSessionApiRoute, withIronSessionSsr } from 'iron-session/next'
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
} from 'next'

import { YEAR_DURATION_IN_SECONDS } from '../constants'

export const SESSION_COOKIE_NAME = 'mww_iron'

export const sessionOptions = {
  password: process.env.IRON_COOKIE_PASSWORD!,
  cookieName: SESSION_COOKIE_NAME,
  ttl: YEAR_DURATION_IN_SECONDS,
  // secure: true should be used in production (HTTPS) but can't be used in development (HTTP)
  cookieOptions: {
    secure:
      process.env.NEXT_PUBLIC_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENV === 'development',
    httpOnly: false,
  },
}

export function withSessionRoute(handler: NextApiHandler) {
  return withIronSessionApiRoute(handler, sessionOptions)
}

// Theses types are compatible with InferGetStaticPropsType https://nextjs.org/docs/basic-features/data-fetching#typescript-use-getstaticprops
export function withSessionSsr<
  P extends { [key: string]: unknown } = { [key: string]: unknown }
>(
  handler: (
    context: GetServerSidePropsContext
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>
) {
  return withIronSessionSsr(handler, sessionOptions)
}
