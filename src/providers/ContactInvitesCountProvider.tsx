import * as React from 'react'

import { Account } from '@/types/Account'
import { getContactInviteRequestCount } from '@/utils/api_helper'
interface IContactStateContext {
  requestCount: number
  fetchRequestCount: () => void
}

const DEFAULT_STATE: IContactStateContext = {
  requestCount: 0,
  fetchRequestCount: () => {},
}

export const ContactCountStateContext =
  React.createContext<IContactStateContext>(DEFAULT_STATE)

const ContactCountStateProvider: React.FC<{
  children: React.ReactNode
  currentAccount?: Account | null
}> = ({ children, currentAccount }) => {
  const [requestCount, setRequestCount] = React.useState(0)
  const fetchRequestCount = async () => {
    const count = await getContactInviteRequestCount()
    setRequestCount(count)
  }
  React.useEffect(() => {
    if (currentAccount) {
      fetchRequestCount()
    }
  }, [currentAccount])
  return (
    <ContactCountStateContext.Provider
      value={{ requestCount, fetchRequestCount }}
    >
      {children}
    </ContactCountStateContext.Provider>
  )
}

export default ContactCountStateProvider
