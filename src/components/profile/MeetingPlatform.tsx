import {
  Checkbox,
  Heading,
  HStack,
  Skeleton,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext, useEffect, useMemo, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { MeetingProvider } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { listConnectedCalendars, saveAccountChanges } from '@/utils/api_helper'
import { renderProviderName } from '@/utils/generic_utils'

type Props = {
  currentAccount: Account
}
const MeetingPlatform: FC<Props> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const { currentAccount } = props
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<
    Array<MeetingProvider>
  >(currentAccount?.preferences?.meetingProvider || [])
  const PROVIDERS = useMemo(() => {
    const providers = [
      MeetingProvider.GOOGLE_MEET,
      MeetingProvider.ZOOM,
      MeetingProvider.HUDDLE,
      MeetingProvider.JITSI_MEET,
    ]
    return hasConnectedCalendar
      ? providers
      : providers.filter(provider => provider !== MeetingProvider.GOOGLE_MEET)
  }, [hasConnectedCalendar])
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
          meetingProvider: newValue,
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
  const loadCalendars = async () => {
    setLoading(true)
    return listConnectedCalendars()
      .then(data => {
        // for old version without the calendars property
        const calendars = data?.map((calendar: ConnectedCalendarCore) => ({
          ...calendar,
          calendars: calendar.calendars,
        }))
        const hasConnectedCalendar = calendars.some(
          val => val.provider.toLowerCase() === 'google'
        )
        setHasConnectedCalendar(hasConnectedCalendar)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCalendars()
  }, [currentAccount])
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

      {loading ? (
        <HStack gap={2} justifyContent="space-between" width="100%">
          <Skeleton height="60px" flex={1} />
          <Skeleton height="60px" flex={1} />
          <Skeleton height="60px" flex={1} />
          <Skeleton height="60px" flex={1} />
        </HStack>
      ) : (
        <>
          <HStack gap={2}>
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
          <HStack gap={2} justifyContent="space-between" width="100%">
            {PROVIDERS.map(provider => (
              <Checkbox
                key={provider}
                borderRadius={8}
                mt={4}
                flex={1}
                borderWidth={1}
                borderColor={
                  selectedProviders.includes(provider)
                    ? 'primary.200'
                    : 'neutral.0'
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
        </>
      )}
    </VStack>
  )
}

export default MeetingPlatform
