import { Box } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'
import React from 'react'

import MeetingPage from '@/components/meeting/MeetingPage'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import redirectTo from '@/utils/redirect'

interface MeetingProps {
  slotId: string
  serverSideRender: boolean
}

const MeetPage: NextPage<MeetingProps> = ({ slotId, ...rest }) => {
  return <MeetingPage slotId={slotId} />
}

const EnchancedMeetingPage = forceAuthenticationCheck(MeetPage)

EnchancedMeetingPage.getInitialProps = async ctx => {
  const slot = ctx.query.slot
  const serverSide = Boolean(ctx.res)

  if (!slot || !slot[0]) {
    return redirectTo('/404', 302, ctx)
  }

  return { slotId: slot as string, serverSideRender: serverSide }
}

export default EnchancedMeetingPage
