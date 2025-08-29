import * as React from 'react'

import { Account } from '@/types/Account'
import {
  getContactInviteRequestCount,
  getGroupInviteCount,
} from '@/utils/api_helper'

interface IMetricStateContext {
  contactsRequestCount: number
  fetchContactsRequestCount: () => Promise<void>
  groupInvitesCount: number
  fetchGroupInvitesCount: () => Promise<void>
}

const DEFAULT_STATE: IMetricStateContext = {
  contactsRequestCount: 0,
  fetchContactsRequestCount: () => {},
  groupInvitesCount: 0,
  fetchGroupInvitesCount: () => {},
}

export const MetricStateContext =
  React.createContext<IMetricStateContext>(DEFAULT_STATE)

const MetricStateProvider: React.FC<{
  children: React.ReactNode
  currentAccount?: Account | null
}> = ({ children, currentAccount }) => {
  const [contactsRequestCount, setContactsRequestCount] = React.useState(0)
  const [groupInvitesCount, setGroupInvitesCount] = React.useState(0)
  const fetchContactsRequestCount = async () => {
    const count = await getContactInviteRequestCount()
    setContactsRequestCount(count)
  }
  const fetchGroupInvitesCount = async () => {
    const count = await getGroupInviteCount()
    setGroupInvitesCount(count)
  }
  const fetchAllMetrics = async () => {
    await Promise.all([fetchContactsRequestCount(), fetchGroupInvitesCount()])
  }
  React.useEffect(() => {
    if (currentAccount) {
      void fetchAllMetrics()
    }
  }, [currentAccount])
  const context = {
    contactsRequestCount,
    fetchContactsRequestCount,
    groupInvitesCount,
    fetchGroupInvitesCount,
  }
  return (
    <MetricStateContext.Provider value={context}>
      {children}
    </MetricStateContext.Provider>
  )
}

export default MetricStateProvider
