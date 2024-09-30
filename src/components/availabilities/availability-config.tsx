import {
  Box,
  Button,
  Heading,
  Spacer,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'

import TimezoneSelector from '@/components/TimezoneSelector'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account, TimeRange } from '@/types/Account'
import { logEvent } from '@/utils/analytics'
import { saveAccountChanges } from '@/utils/api_helper'

import { WeekdayConfig } from './weekday-config'

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)

  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState<string | null | undefined>(
    currentAccount!.preferences.timezone
  )

  const [initialAvailabilities, setInitialAvailabilities] = useState([
    ...(currentAccount!.preferences.availabilities || []),
  ])

  useEffect(() => {
    setTimezone(currentAccount!.preferences.timezone)
    const availabilities = [
      ...(currentAccount!.preferences.availabilities || []),
    ]
    for (let i = 0; i <= 6; i++) {
      let found = false
      for (const availability of initialAvailabilities) {
        if (availability.weekday === i) {
          found = true
        }
      }
      if (!found) {
        availabilities.push({ weekday: i, ranges: [] })
      }
    }
    setInitialAvailabilities(availabilities)
  }, [currentAccount.address])

  const saveAvailabilities = async () => {
    try {
      if (!timezone) {
        toast({
          title: 'Please select timezone',
          description: 'You need to provide a proper timezone.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        return
      }

      setLoading(true)

      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
          availabilities: initialAvailabilities,
          timezone: timezone,
        },
      })
      login(updatedAccount)
      logEvent('Updated availabilities')
    } catch (e) {
      //TODO handle error
      console.error(e)
    } finally {
      reloadOnboardingInfo()
      setLoading(false)
    }
  }

  const onChange = (day: number, ranges: TimeRange[] | null) => {
    const newAvailabilities = [...initialAvailabilities]
    newAvailabilities[day] = { weekday: day, ranges: ranges ?? [] }
    setInitialAvailabilities(newAvailabilities)
  }

  const onChangeTz = (_timezone?: string | null) => {
    setTimezone(_timezone)
  }

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <Heading fontSize="2xl">Availabilities</Heading>
      <Box width="100%">
        <Text pb={2}>Your timezone</Text>
        <TimezoneSelector value={timezone} onChange={onChangeTz} />
      </Box>
      <Text pt={2}>Your availabilities</Text>
      {initialAvailabilities.map((availability, index) => (
        <WeekdayConfig
          key={`${currentAccount.address}:${index}`}
          dayAvailability={availability}
          onChange={onChange}
        />
      ))}
      <Spacer />
      <Button
        isLoading={loading}
        alignSelf="start"
        colorScheme="primary"
        onClick={saveAvailabilities}
      >
        Save information
      </Button>
    </VStack>
  )
}

export default AvailabilityConfig
