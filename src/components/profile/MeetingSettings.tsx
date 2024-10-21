import { Heading, VStack } from '@chakra-ui/react'
import React from 'react'

import { Account } from '@/types/Account'

import MeetingPlatform from './MeetingPlatform'
import MeetingTypesConfig from './MeetingTypesConfig'

const MeetingSettings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'} mb={4}>
      <Heading fontSize="2xl">Meeting Settings</Heading>
      <MeetingTypesConfig currentAccount={currentAccount} />
      <MeetingPlatform currentAccount={currentAccount} />
    </VStack>
  )
}

export default MeetingSettings
