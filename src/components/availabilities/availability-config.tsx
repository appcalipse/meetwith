import {
  Box,
  Button,
  Heading,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'

import { Account, TimeRange } from '@/types/Account'

import { AccountContext } from '../../providers/AccountProvider'
import { logEvent } from '../../utils/analytics'
import { saveAccountChanges } from '../../utils/api_helper'
import TimezoneSelector from '../TimezoneSelector'
import { WeekdayConfig } from './weekday-config'

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)

  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState(
    currentAccount!.preferences!.timezone
  )
  const [initialAvailabilities, setInitialAvailabilities] = useState([
    ...currentAccount!.preferences!.availabilities,
  ])

  useEffect(() => {
    setTimezone(currentAccount!.preferences!.timezone)
    const availabilities = [...currentAccount!.preferences!.availabilities]
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

  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const saveAvailabilities = async () => {
    setLoading(true)

    try {
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
    }

    setLoading(false)
  }

  const onChange = (day: number, ranges: TimeRange[]) => {
    const newAvailabilities = [...initialAvailabilities]
    newAvailabilities[day] = { weekday: day, ranges }
    setInitialAvailabilities(newAvailabilities)
  }

  const onChangeTz = (_timezone: string) => {
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
        <Box
          key={`${currentAccount.address}:${index}`}
          py={2}
          width="100%"
          borderBottom="1px solid"
          borderColor={borderColor}
        >
          <WeekdayConfig dayAvailability={availability} onChange={onChange} />
        </Box>
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
