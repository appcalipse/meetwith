import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'

const notAuthorized = new Response('Auth required', {
  status: 401,
})

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  console.log(req)
  if (req.headers.get('X-Server-Secret') === process.env.SERVER_SECRET) {
    return NextResponse.next()
  }

  return notAuthorized
}
