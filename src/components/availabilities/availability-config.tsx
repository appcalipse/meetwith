import {
  Box,
  Button,
  Heading,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useContext, useEffect, useRef, useState } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import { TimeRange } from '../../types/Account'
import { logEvent } from '../../utils/analytics'
import { saveAccountChanges } from '../../utils/api_helper'
import TimezoneSelector from '../TimezoneSelector'
import { WeekdayConfig } from './weekday-config'

const AvailabilityConfig: React.FC = () => {
  const { currentAccount, login } = useContext(AccountContext)

  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState(
    currentAccount!.preferences!.timezone
  )

  const initialAvailabilities = [...currentAccount!.preferences!.availabilities]

  useEffect(() => {
    for (let i = 0; i <= 6; i++) {
      let found = false
      for (const availability of initialAvailabilities) {
        if (availability.weekday === i) {
          found = true
        }
      }
      if (!found) {
        initialAvailabilities.push({ weekday: i, ranges: [] })
      }
    }
  }, [])

  const availabilities = useRef(initialAvailabilities)

  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const saveAvailabilities = async () => {
    setLoading(true)

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
          availabilities: availabilities.current,
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
    const newAvailabilities = [...availabilities.current]
    newAvailabilities[day] = { weekday: day, ranges }
    availabilities.current = newAvailabilities
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
          key={index}
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
        colorScheme="orange"
        onClick={saveAvailabilities}
      >
        Save information
      </Button>
    </VStack>
  )
}

export default AvailabilityConfig
