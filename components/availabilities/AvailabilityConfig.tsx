import {
  HStack,
  Text,
  VStack,
  Spacer,
  Checkbox,
  IconButton,
  Box,
  useColorModeValue,
  Button,
} from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'
import dayjs from '../../utils/dayjs_extender'
import { useState } from 'react'
import { FaPlus, FaTrash } from 'react-icons/fa'
import { DayAvailability, TimeRange } from '../../types/Account'
import { useEffect, useContext } from 'react'
import { defaultTimeRange } from '../../utils/calendar_manager'
import { saveAccountChanges } from '../../utils/api_helper'
import { AccountContext } from '../../providers/AccountProvider'
import TimezoneSelector from '../TimezoneSelector'
import { logEvent } from '../../utils/analytics'

const AvailabilityConfig: React.FC = () => {
  const { currentAccount, login } = useContext(AccountContext)

  const [loading, setLoading] = useState(false)

  const initialAvailabilities = currentAccount!.preferences!.availabilities

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

  const [availabilities, setAvailabilities] = useState(initialAvailabilities)

  let timezone = currentAccount!.preferences!.timezone

  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const saveAvailabilities = async () => {
    setLoading(true)

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
          availabilities: availabilities,
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
    const newAvailabilities = [...availabilities]
    newAvailabilities[day] = { weekday: day, ranges }
    setAvailabilities(newAvailabilities)
  }

  const onChangeTz = (_timezone: string) => {
    timezone = _timezone
  }

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <Box width="100%">
        <Text pb={2}>Your timezone</Text>
        <TimezoneSelector
          value={currentAccount!.preferences!.timezone}
          onChange={onChangeTz}
        />
      </Box>
      <Text pt={2}>Your availabilities</Text>
      {availabilities.map((availability, index) => (
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

interface WeekdayConfigProps {
  dayAvailability: DayAvailability
  onChange: (weekday: number, times: TimeRange[]) => void
}

const WeekdayConfig: React.FC<WeekdayConfigProps> = props => {
  const [isSelected, setSelected] = useState(
    props.dayAvailability.ranges.length > 0
  )

  const [error, setError] = useState([])

  const [times, setTimes] = useState(props.dayAvailability.ranges)

  const onChangeTime = (index: number, start: string, end: string) => {
    const newTimes = [...times]
    newTimes[index] = { start, end }
    setTimes(newTimes)
  }

  useEffect(() => {
    if (isSelected && times.length === 0) {
      setTimes([defaultTimeRange()])
    } else if (!isSelected) {
      setTimes([])
    }
  }, [isSelected])

  useEffect(() => {
    props.onChange(props.dayAvailability.weekday, times)
  }, [times])

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  return (
    <HStack alignItems="start" minH="40px" width="100%">
      <Checkbox
        pt={2}
        colorScheme="orange"
        isChecked={isSelected}
        onChange={e => setSelected(e.target.checked)}
        minW="140px"
      >
        <strong>
          {dayjs().day(props.dayAvailability.weekday).format('dddd')}
        </strong>
      </Checkbox>
      <Spacer />
      {isSelected ? (
        <VStack alignItems="start">
          {times.map((time, index) => (
            <VStack alignItems="start" key={index}>
              <HStack>
                <TimeRange
                  onChange={onChangeTime}
                  index={index}
                  start={time.start}
                  end={time.end}
                />
                <IconButton
                  color={iconColor}
                  aria-label="remove"
                  icon={<FaTrash size={18} />}
                  onClick={() => {
                    const newTimes = [...times]
                    newTimes.splice(index, 1)
                    setTimes(newTimes)
                    if (newTimes.length === 0) {
                      setSelected(false)
                    }
                  }}
                />
              </HStack>
              {error[index] && <Text>{error[index]}</Text>}
            </VStack>
          ))}
        </VStack>
      ) : (
        <Text ml={2} pt={2}>
          Not available
        </Text>
      )}
      <Spacer flex={1} />

      {isSelected && (
        <IconButton
          color={iconColor}
          aria-label="add"
          icon={<FaPlus size={18} />}
          onClick={() => {
            const newTimes = [...times]
            if (newTimes.length === 0) {
              newTimes.push(defaultTimeRange())
            } else {
              newTimes.push(defaultTimeRange())
              //TODO calculate best fit for net time
            }
            setTimes(newTimes)
          }}
        />
      )}
    </HStack>
  )
}

const TimeRange: React.FC<{
  index: number
  onChange: (index: number, start: string, end: string) => void
  start: string
  end: string
}> = props => {
  const onChangeStart = (time: string) => {
    props.onChange(props.index, time, props.end)
  }

  const onChangeEnd = (time: string) => {
    props.onChange(props.index, props.start, time)
  }

  return (
    <HStack>
      <TimeSelector onChange={onChangeStart} time={props.start} />
      <Text>-</Text>
      <TimeSelector onChange={onChangeEnd} time={props.end} />
    </HStack>
  )
}

const TimeSelector: React.FC<{
  onChange: (time: string) => void
  time: string
}> = props => {
  const times = []
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      times.push(`${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`)
    }
  }
  return (
    <Select value={props.time} onChange={e => props.onChange(e.target.value)}>
      {times.map((time, index) => (
        <option key={index} value={time}>
          {time}
        </option>
      ))}
    </Select>
  )
}

export default AvailabilityConfig
