import { Heading, VStack } from '@chakra-ui/react'
import React from 'react'

import { Account } from '@/types/Account'

import MeetingTypesConfig from './MeetingTypesConfig'

const MeetingSettings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  return (
    <VStack width="100%" maxW="100%" alignItems={'flex-start'} mb={4}>
      <Heading fontSize="2xl">Meeting Settings</Heading>
      <MeetingTypesConfig currentAccount={currentAccount} />
    </VStack>
  )
}

export default MeetingSettings
