import { captureException } from '@sentry/nextjs'
import { getIronSession } from 'iron-session/edge'
import { NextRequest, NextResponse } from 'next/server'

import { apiUrl, YEAR_DURATION_IN_SECONDS } from './utils/constants'

export const SESSION_COOKIE_NAME = 'mww_iron'

export const sessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  // secure: true should be used in production (HTTPS) but can't be used in development (HTTP)
  cookieOptions: {
    httpOnly: false,
    secure:
      process.env.NEXT_PUBLIC_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENV === 'development',
  },
  password: process.env.IRON_COOKIE_PASSWORD!,
  ttl: YEAR_DURATION_IN_SECONDS,
}

export function middleware(request: NextRequest) {
  try {
    if (request.nextUrl.pathname.startsWith('/api/secure')) {
      return handleSecureRoute(request)
    }

    if (request.nextUrl.pathname.startsWith('/api/server')) {
      return handleServerRoute(request)
    }
  } catch (e) {
    captureException(e)
    return notAuthorized()
  }
  return NextResponse.next()
}

export const notAuthorized = () => {
  return NextResponse.redirect(new URL('/401', apiUrl))
}

// Supports both a single string value or an array of matchers
export const config = {
  matcher: ['/api/secure/:path*', '/api/server/:path*'],
}

const handleSecureRoute = async (req: NextRequest) => {
  const res = NextResponse.next()

  const session = await getIronSession(req, res, sessionOptions)

  if (!session?.account) return notAuthorized()

  const response = await fetch(`${apiUrl}/server/accounts/check`, {
    body: JSON.stringify({
      address: session.account.address,
      signature: session.account.signature,
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Secret': process.env.SERVER_SECRET!,
    },
    method: 'POST',
  })

  if (response.status !== 200) return notAuthorized()
}

const handleServerRoute = async (req: NextRequest) => {
  const serverSecret = process.env.SERVER_SECRET
  const authHeader =
    req.headers.get('X-Server-Secret') ||
    req.headers.get('X-Goog-Channel-Token')

  if (authHeader === serverSecret) {
    return NextResponse.next()
  }

  return notAuthorized()
}
