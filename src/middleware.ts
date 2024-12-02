import { getIronSession } from 'iron-session/edge'
import { NextRequest, NextResponse } from 'next/server'

import { apiUrl, YEAR_DURATION_IN_SECONDS } from './utils/constants'

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

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/secure')) {
    return handleSecureRoute(request)
  }

  if (request.nextUrl.pathname.startsWith('/api/server')) {
    return handleServerRoute(request)
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

  if (!session?.account) return notAuthorized

  const response = await fetch(`${apiUrl}/server/accounts/check`, {
    method: 'POST',
    body: JSON.stringify({
      address: session.account.address,
      signature: session.account.signature,
    }),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })

  if (response.status !== 200) return notAuthorized
}

const handleServerRoute = async (req: NextRequest) => {
  if (req.headers.get('X-Server-Secret') === process.env.SERVER_SECRET) {
    return NextResponse.next()
  }

  return notAuthorized
}
