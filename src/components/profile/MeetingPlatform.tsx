import {
  Checkbox,
  Heading,
  HStack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext, useMemo, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import { MeetingProvider } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { saveAccountChanges } from '@/utils/api_helper'
import { renderProviderName } from '@/utils/generic_utils'

type Props = {
  currentAccount: Account
}
const MeetingPlatform: FC<Props> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const { currentAccount } = props
  const toast = useToast()

  const [selectedProviders, setSelectedProviders] = useState<
    Array<MeetingProvider>
  >(currentAccount?.preferences?.meetingProviders || [])
  const PROVIDERS = useMemo(() => {
    return [
      MeetingProvider.GOOGLE_MEET,
      MeetingProvider.ZOOM,
      MeetingProvider.HUDDLE,
      MeetingProvider.JITSI_MEET,
    ]
  }, [])
  const { login } = useContext(AccountContext)
  const handleChange = async (value: MeetingProvider | 'ALL' | 'RESET') => {
    let newValue!: Array<MeetingProvider>
    if (value === 'ALL') {
      newValue = PROVIDERS.map(provider => provider)
      setSelectedProviders(newValue)
    } else if (value === 'RESET') {
      newValue = []
      setSelectedProviders(newValue)
    } else if (selectedProviders.includes(value)) {
      newValue = selectedProviders.filter(v => v !== value)
      setSelectedProviders(newValue)
    } else {
      newValue = [...selectedProviders, value]
      setSelectedProviders(newValue)
    }
    handleUpdate(newValue)
  }
  const handleUpdate = async (newValue: Array<MeetingProvider>) => {
    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount.preferences!,
          meetingProviders: newValue,
        },
      })
      logEvent('updated_meeting_provider', { selectedProviders })
      login(updatedAccount)
    } catch (e) {
      toast({
        title: 'Error Occurred',
        description:
          'Updating meeting platform failed please re-fresh page and retry.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
  }

  return (
    <VStack
      alignItems="flex-start"
      width="100%"
      bg={bgColor}
      p={8}
      borderRadius={12}
      gap={4}
    >
      <VStack alignItems="flex-start" width="100%">
        <Heading fontSize="2xl">Meeting Platform</Heading>
        <Text color="neutral.400" mt={2}>
          Choose your default Meeting Platform
        </Text>
      </VStack>

      <HStack gap={2} width="100%">
        <Checkbox
          colorScheme="primary"
          value={
            selectedProviders.length === PROVIDERS.length ? 'RESET' : 'ALL'
          }
          size="lg"
          borderColor="primary.200"
          isChecked={selectedProviders.length === PROVIDERS.length}
          onChange={e => {
            handleChange(e.target.value as MeetingProvider)
          }}
        >
          <Text fontWeight="600" color={'primary.200'}>
            Select all
          </Text>
        </Checkbox>
      </HStack>
      <HStack
        gap={2}
        justifyContent="space-between"
        flexWrap="wrap"
        width="100%"
      >
        {PROVIDERS.map(provider => (
          <Checkbox
            key={provider}
            borderRadius={8}
            mt={4}
            flexBasis={{
              base: '45%',
              md: '25%',
            }}
            borderWidth={1}
            borderColor={
              selectedProviders.includes(provider) ? 'primary.200' : 'neutral.0'
            }
            colorScheme="primary"
            value={provider}
            p={4}
            size="lg"
            isChecked={selectedProviders.includes(provider)}
            onChange={e => {
              handleChange(e.target.value as MeetingProvider)
            }}
            flexDirection="row-reverse"
            justifyContent="space-between"
            w="100%"
          >
            <Text
              fontWeight="600"
              color={
                selectedProviders.includes(provider)
                  ? 'primary.200'
                  : 'neutral.0'
              }
              cursor="pointer"
            >
              {renderProviderName(provider)}
            </Text>
          </Checkbox>
        ))}
      </HStack>
    </VStack>
  )
}

export default MeetingPlatform
