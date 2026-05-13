import { withIronSessionApiRoute, withIronSessionSsr } from 'iron-session/next'
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
} from 'next'

declare module 'iron-session' {
  interface IronSessionData {
    account?: AccountSession
  }
}

import { translateText } from '@/i18n'
import { getLocaleFromRequest } from '@/i18n/server'
import { sessionOptions } from '@/middleware'
import { AccountSession } from '@/types/Session'

const localizeApiResponseBody = (locale: string, body: unknown) => {
  if (typeof body === 'string') return translateText(locale, body)

  if (!body || typeof body !== 'object' || Array.isArray(body)) return body

  const localizedBody = { ...(body as Record<string, unknown>) }

  if (typeof localizedBody.error === 'string') {
    localizedBody.error = translateText(locale, localizedBody.error)
  }

  if (typeof localizedBody.message === 'string') {
    localizedBody.message = translateText(locale, localizedBody.message)
  }

  return localizedBody
}

export function withSessionRoute(handler: NextApiHandler) {
  return withIronSessionApiRoute((req, res) => {
    const locale = getLocaleFromRequest(req)
    const send = res.send.bind(res)
    const json = res.json.bind(res)

    res.send = (body: unknown) => send(localizeApiResponseBody(locale, body))
    res.json = (body: unknown) => json(localizeApiResponseBody(locale, body))

    return handler(req, res)
  }, sessionOptions)
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
