import { Heading, VStack } from '@chakra-ui/react'
import { OnrampWebSDK } from '@onramp.money/onramp-web-sdk'
import React, { useEffect } from 'react'

import { Account } from '@/types/Account'
const onrampInstance = new OnrampWebSDK({
  appId: 1, // replace this with the appID you got during onboarding process
  walletAddress: '0x495f519017eF0368e82Af52b4B64461542a5430B', // replace with user's wallet address
  flowType: 2, // 1 -> onramp || 2 -> offramp || 3 -> Merchant checkout,
  fiatType: 6,
  paymentMethod: 2, // 1 -> Instant transafer(UPI) || 2 -> Bank transfer(IMPS/FAST)
  lang: 'vi', // for more lang values refer
  // ... pass other configs
})
import MeetingPlatform from './MeetingPlatform'
import MeetingTypesConfig from './MeetingTypesConfig'
const MeetingSettings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  onrampInstance.show()
  useEffect(() => {}, [])
  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'} mb={4}>
      <Heading fontSize="2xl">Session Settings</Heading>
      <MeetingTypesConfig currentAccount={currentAccount} />
      <MeetingPlatform currentAccount={currentAccount} />
    </VStack>
  )
}

export default MeetingSettings
