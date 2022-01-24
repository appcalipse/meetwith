import { NextPage } from 'next'
import Router from 'next/router'
import React from 'react'

import PublicCalendar from '../components/public-calendar'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'

const Schedule: NextPage = () => <PublicCalendar />

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.address
  let serverSide = false

  if (ctx.res) {
    serverSide = true
  }
  if (address && address[0] && /^0x[a-fA-F0-9]{40}$/.test(address[0])) {
    const newLocation = `/address/${address[0]}`
    if (serverSide) {
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

export default EnhancedSchedule
