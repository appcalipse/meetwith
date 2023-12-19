import {
  Box,
  Checkbox,
  HStack,
  IconButton,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format, setDay } from 'date-fns'
import { FaPlusCircle, FaTrash } from 'react-icons/fa'

import { DayAvailability, TimeRange } from '@/types/Account'
import { defaultTimeRange } from '@/utils/calendar_manager'

import { TimeSelector } from './time-selector'

type WeekdayConfigProps = {
  dayAvailability: DayAvailability
  onChange: (weekday: number, times: TimeRange[] | null) => void
}

const getNewSlotEnd = (start: string) => {
  const [hours, minutes] = start.split(':')

  const hoursToNum = Number(hours)

  if (hoursToNum === 23) return '24:00'

  return `${String(hoursToNum + 1).padStart(2, '0')}:${minutes}`
}

export const WeekdayConfig: React.FC<WeekdayConfigProps> = props => {
  const handleChangeTime = (index: number, start: string, end: string) => {
    const newTimes = [...times]
    newTimes[index] = { start, end }
    props.onChange(props.dayAvailability.weekday, newTimes)
  }

  const handleAddSlotClick = () => {
    const start = times[times.length - 1].end

    props.onChange(props.dayAvailability.weekday, [
      ...times,
      {
        start,
        end: getNewSlotEnd(start),
      },
    ])
  }

  const handleTimeRemoveClick = (index: number) => {
    const newTimes = [...times]
    newTimes.splice(index, 1)
    props.onChange(props.dayAvailability.weekday, newTimes)
  }

  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const isSelected = props.dayAvailability.ranges.length > 0
  const times = [...props.dayAvailability.ranges].sort(
    (a, b) =>
      Number(a.start.split(':').join('')) - Number(b.start.split(':').join(''))
  )

  return (
    <Box py={2} width="100%" borderBottom="1px solid" borderColor={borderColor}>
      <HStack
        alignItems="start"
        minH="40px"
        width="100%"
        flexDirection={{ base: 'column', md: 'row' }}
        gridGap={2}
      >
        <Checkbox
          pt={2}
          colorScheme="primary"
          isChecked={isSelected}
          onChange={e => {
            props.onChange(
              props.dayAvailability.weekday,
              e.target.checked ? [defaultTimeRange()] : null
            )
          }}
          minW="140px"
        >
          <strong>
            {format(setDay(new Date(), props.dayAvailability.weekday), 'cccc')}
          </strong>
        </Checkbox>
        <Spacer />
        {isSelected ? (
          <VStack alignItems="start">
            {times.map((time, index) => (
              <VStack alignItems="start" key={index}>
                <HStack>
                  <TimeSelector
                    onChange={handleChangeTime}
                    index={index}
                    start={time.start}
                    end={time.end}
                    {...(index > 0 && { previousEnd: times[index - 1].end })}
                    {...(index < times.length - 1 && {
                      nextStart: times[index + 1].start,
                    })}
                  />
                  <IconButton
                    color={iconColor}
                    aria-label="remove"
                    icon={<FaTrash size={18} />}
                    onClick={() => handleTimeRemoveClick(index)}
                  />
                </HStack>
              </VStack>
            ))}
          </VStack>
        ) : (
          <Text flex={1} ml={2} pt={2}>
            Not available
          </Text>
        )}

        {isSelected && (
          <IconButton
            margin="0"
            color={iconColor}
            aria-label="add"
            icon={<FaPlusCircle size={18} />}
            onClick={handleAddSlotClick}
          />
        )}
      </HStack>
    </Box>
  )
}
