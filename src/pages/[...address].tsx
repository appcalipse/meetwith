import { NextPage } from 'next'
import Router from 'next/router'

import { isValidEVMAddress } from '../utils/validations'

const Redirect: NextPage = () => null

Redirect.getInitialProps = async ctx => {
  const address = ctx.query.address
  let serverSide = false

  if (ctx.res) {
    serverSide = true
  }
  if (address && address[0] && isValidEVMAddress(address[0])) {
    const newLocation = `/address/${address[0]}`
    if (serverSide) {
      //TODO: why is it 302? isn't 302 temporary
      ctx.res!.writeHead(302, {
        Location: newLocation,
      })
      ctx.res!.end()
    } else {
      Router.replace(newLocation)
    }
  }

  return {}
}

export default Redirect
