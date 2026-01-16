import * as React from 'react'

import { Account } from '@/types/Account'
import { PollStatus } from '@/types/QuickPoll'
import {
  getContactInviteRequestCount,
  getGroupInviteCount,
  getQuickPolls,
} from '@/utils/api_helper'
import {
  QUICKPOLL_COUNT_FETCH_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
} from '@/utils/constants'

interface IMetricStateContext {
  contactsRequestCount: number
  fetchContactsRequestCount: () => Promise<void>
  groupInvitesCount: number
  fetchGroupInvitesCount: () => Promise<void>
  ongoingPollsCount: number
  pastPollsCount: number
  fetchPollCounts: (searchQuery?: string) => Promise<void>
  isLoadingPollCounts: boolean
}

const DEFAULT_STATE: IMetricStateContext = {
  contactsRequestCount: 0,
  fetchContactsRequestCount: async () => {},
  fetchGroupInvitesCount: async () => {},
  fetchPollCounts: async () => {},
  groupInvitesCount: 0,
  isLoadingPollCounts: false,
  ongoingPollsCount: 0,
  pastPollsCount: 0,
}

export const MetricStateContext =
  React.createContext<IMetricStateContext>(DEFAULT_STATE)

const MetricStateProvider: React.FC<{
  children: React.ReactNode
  currentAccount?: Account | null
}> = ({ children, currentAccount }) => {
  const [contactsRequestCount, setContactsRequestCount] = React.useState(0)
  const [groupInvitesCount, setGroupInvitesCount] = React.useState(0)
  const [ongoingPollsCount, setOngoingPollsCount] = React.useState(0)
  const [pastPollsCount, setPastPollsCount] = React.useState(0)
  const [isLoadingPollCounts, setIsLoadingPollCounts] = React.useState(false)

  const fetchContactsRequestCount = async () => {
    const count = await getContactInviteRequestCount()
    setContactsRequestCount(count)
  }
  const fetchGroupInvitesCount = async () => {
    const count = await getGroupInviteCount()
    setGroupInvitesCount(count)
  }

  const fetchPollCounts = async (searchQuery?: string) => {
    setIsLoadingPollCounts(true)
    try {
      const [ongoingData, pastData] = await Promise.all([
        getQuickPolls(
          QUICKPOLL_COUNT_FETCH_LIMIT,
          QUICKPOLL_DEFAULT_OFFSET,
          searchQuery || '',
          PollStatus.ONGOING
        ),
        getQuickPolls(
          QUICKPOLL_COUNT_FETCH_LIMIT,
          QUICKPOLL_DEFAULT_OFFSET,
          searchQuery || '',
          PollStatus.COMPLETED,
          PollStatus.CANCELLED,
          PollStatus.EXPIRED
        ),
      ])
      setOngoingPollsCount(ongoingData?.total_count || 0)
      setPastPollsCount(pastData?.total_count || 0)
    } catch (error) {
      console.error('Error fetching poll counts:', error)
    } finally {
      setIsLoadingPollCounts(false)
    }
  }

  const fetchAllMetrics = async () => {
    await Promise.all([
      fetchContactsRequestCount(),
      fetchGroupInvitesCount(),
      fetchPollCounts(),
    ])
  }
  React.useEffect(() => {
    if (currentAccount) {
      void fetchAllMetrics()
    }
  }, [currentAccount])
  const context = {
    contactsRequestCount,
    fetchContactsRequestCount,
    fetchGroupInvitesCount,
    fetchPollCounts,
    groupInvitesCount,
    isLoadingPollCounts,
    ongoingPollsCount,
    pastPollsCount,
  }
  return (
    <MetricStateContext.Provider value={context}>
      {children}
    </MetricStateContext.Provider>
  )
}

export default MetricStateProvider
