import { Head } from '@components/Head'
import { Account } from '@meta/Account'
import { GroupMeetingRequest } from '@meta/Meeting'
import { getAccountDisplayName } from '@utils/user_manager'
import React from 'react'

import { apiUrl } from '@/utils/constants'

interface IProps {
  account?: Account
  teamMeetingRequest?: GroupMeetingRequest
  url: string
}
const HeadMeta: React.FC<IProps> = ({ account, teamMeetingRequest, url }) => {
  const title = account
    ? `${getAccountDisplayName(
        account
      )}'s calendar on Meetwith - Schedule a meeting in #web3 style`
    : teamMeetingRequest?.title ||
      'Meetwith - Schedule a meeting in #web3 style'

  const description =
    account?.preferences?.description ||
    'Schedule a meeting by simply connecting your web3 wallet, or use your email and schedule as a guest.'
  const identifier = account?.address
  return (
    <Head
      title={title}
      description={description}
      url={url}
      ogImage={`${apiUrl}/accounts/social/og/${identifier}?params=${encodeURIComponent(
        url
      )}`}
    />
  )
}

export default HeadMeta
