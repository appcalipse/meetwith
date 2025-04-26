import * as React from 'react'

import { Account } from '@/types/Account'
import { ContactInvite } from '@/types/Contacts'
import { getContactInviteRequestCount } from '@/utils/api_helper'

interface IContactStateContext {
  selectedContact: ContactInvite | null
  setSelectedContact: (contact: ContactInvite) => void
  requestCount: number
  fetchRequestCount: () => void
}

const DEFAULT_STATE: IContactStateContext = {
  selectedContact: null,
  setSelectedContact: () => {},
  requestCount: 0,
  fetchRequestCount: () => {},
}

export const ContactStateContext =
  React.createContext<IContactStateContext>(DEFAULT_STATE)

const ContactStateProvider: React.FC<{
  children: React.ReactNode
  currentAccount?: Account | null
}> = ({ children, currentAccount }) => {
  const [selectedContact, setSelectedContact] =
    React.useState<ContactInvite | null>(null)
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
    <ContactStateContext.Provider
      value={{
        selectedContact,
        setSelectedContact,
        requestCount,
        fetchRequestCount,
      }}
    >
      {children}
    </ContactStateContext.Provider>
  )
}

export default ContactStateProvider
