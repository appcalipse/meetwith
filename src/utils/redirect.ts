import { NextPageContext } from 'next'
import Router from 'next/router'

const redirectTo = (path: string, httpCode: number, ctx: NextPageContext) => {
  const serverSide = Boolean(ctx.res)

  if (serverSide) {
    ctx.res!.writeHead(httpCode, {
      Location: path,
    })
    ctx.res!.end()
  } else {
    Router.replace(path)
  }
  return {}
}

export default redirectTo
