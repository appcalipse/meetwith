// middleware.ts
import { getIronSession } from 'iron-session/edge'
import { NextRequest, NextResponse } from 'next/server'

import { apiUrl, YEAR_DURATION_IN_SECONDS } from './utils/constants'
// import { checkSignature } from './utils/cryptography'

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

const notAuthorized = NextResponse.redirect(new URL('/401', apiUrl))

// Supports both a single string value or an array of matchers
export const config = {
  matcher: ['/api/secure/:path*', '/api/server/:path*'],
}

const handleSecureRoute = async (req: NextRequest) => {
  const res = NextResponse.next()

  const session = await getIronSession(req, res, sessionOptions)

  if (!session?.account) return notAuthorized

  try {
    //Middleware don't support some functions, so if I try to use database directly it explodes
    const response = await (
      await fetch(`${apiUrl}/accounts/nonce_hidden/${session.account.address}`)
    ).json()

    // const recovered = checkSignature(
    //   session.account.signature,
    //   response.nonce! as number
    // )

    // if (session.account.address.toLowerCase() !== recovered.toLowerCase())
    //   return notAuthorized

    return res
  } catch (e) {
    console.error(e)
    throw e
  }
}

const handleServerRoute = async (req: NextRequest) => {
  if (req.headers.get('X-Server-Secret') === process.env.SERVER_SECRET) {
    return NextResponse.next()
  }

  return notAuthorized
}
