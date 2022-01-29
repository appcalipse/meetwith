import { Button, Spinner, VStack } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { FaGoogle } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { getGoogleAuthConnectUrl } from '../../utils/api_helper'

export const CalendarConnectionsConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [loading, setLoading] = useState(false)
  const connected = currentAccount?.connected_accounts
  const [google, setGoogle] = useState('')

  const connectGoogle = async () => {
    setLoading(true)
    const data = await getGoogleAuthConnectUrl()
    setLoading(false)
    window.location.assign(data.url)
  }

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      {loading ? <Spinner display={!loading ? 'none' : 'flex'} /> : false}
      <Button colorScheme={'orange'} onClick={connectGoogle}>
        <FaGoogle /> Google (
        {!!connected?.google ? 'Connected' : 'Not Connected'})
      </Button>
    </VStack>
  )
}
