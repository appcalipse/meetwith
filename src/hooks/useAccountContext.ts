import { useContext } from 'react'

import { AccountContext } from '@/providers/AccountProvider'

const useAccountContext = () => {
  const { currentAccount } = useContext(AccountContext)
  return currentAccount
}

export default useAccountContext
