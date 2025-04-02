import * as React from 'react'

import { ContactInvite } from '@/types/Contacts'

interface IContactStateContext {
  selectedContact: ContactInvite | null
  setSelectedContact: (contact: ContactInvite) => void
}

const DEFAULT_STATE: IContactStateContext = {
  selectedContact: null,
  setSelectedContact: () => {},
}

export const ContactStateContext =
  React.createContext<IContactStateContext>(DEFAULT_STATE)

const ContactStateProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [selectedContact, setSelectedContact] =
    React.useState<ContactInvite | null>(null)
  return (
    <ContactStateContext.Provider
      value={{
        selectedContact,
        setSelectedContact,
      }}
    >
      {children}
    </ContactStateContext.Provider>
  )
}

export default ContactStateProvider
