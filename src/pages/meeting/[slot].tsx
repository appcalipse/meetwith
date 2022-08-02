import { Box } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'
import React from 'react'

import MeetingPage from '@/components/meeting/MettingPage'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { DBSlotEnhanced } from '@/types/Meeting'
import { getAccount } from '@/utils/api_helper'
import { getMeetingFromDB } from '@/utils/database'
import { MeetingNotFoundError } from '@/utils/errors'
import redirectTo from '@/utils/redirect'

interface MeetingProps {
  meeting: DBSlotEnhanced
  serverSideRender: boolean
}

const MeetPage: NextPage<MeetingProps> = ({ meeting, ...rest }) => {
  return <MeetingPage />
}

const EnchancedMeetingPage = forceAuthenticationCheck(MeetPage)

EnchancedMeetingPage.getInitialProps = async ctx => {
  const slot = ctx.query.slot
  const serverSide = Boolean(ctx.res)

  if (!slot || !slot[0]) {
    return redirectTo('/404', 302, ctx)
  }

  return {}

  //   try {
  //     const meeting = await getMeetingFromDB(slot_id[0])

  //     if (!meeting) {
  //       return redirectTo('/404', 302, ctx)
  //     }

  //     return { meeting, serverSideRender: serverSide }
  //   } catch (e) {
  //     if (!(e instanceof MeetingNotFoundError)) {
  //       Sentry.captureException(e)
  //     }

  //     return redirectTo('/404', 302, ctx)
  //   }
}

export default EnchancedMeetingPage
