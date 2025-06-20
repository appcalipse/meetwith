import { DeleteIcon } from '@chakra-ui/icons'
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

import { TimeRange } from '@/types/Account'

import { TimeSelector } from './TimeSelector'

type DayAvailability = {
  weekday: number
  ranges: TimeRange[]
}

type WeekdayConfigProps = {
  dayAvailability: DayAvailability
  onChange: (weekday: number, times: TimeRange[] | null) => void
}

const defaultTimeRange = () => ({
  start: '09:00',
  end: '17:00',
})

const getNewSlotEnd = (start: string) => {
  const [hours, minutes] = start.split(':')
  const endHours = (parseInt(hours) + 1).toString().padStart(2, '0')
  return `${endHours}:${minutes}`
}

export const WeekdayConfig: React.FC<WeekdayConfigProps> = props => {
  const { dayAvailability, onChange } = props
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const borderColor = useColorModeValue('gray.300', 'gray.700')

  // Ensure ranges exists and is an array
  const ranges = dayAvailability?.ranges || []
  const isSelected = ranges.length > 0
  const times = [...ranges].sort((a, b) => {
    if (!a.start || !b.start) return 0
    return (
      Number(a.start.split(':').join('')) - Number(b.start.split(':').join(''))
    )
  })

  const handleChangeTime = (index: number, start: string, end: string) => {
    const newTimes = [...times]
    newTimes[index] = { start, end }
    onChange(dayAvailability.weekday, newTimes)
  }

  const handleAddSlotClick = () => {
    const start = times[times.length - 1].end

    onChange(dayAvailability.weekday, [
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
    onChange(dayAvailability.weekday, newTimes.length === 0 ? null : newTimes)
  }

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
            onChange(
              dayAvailability.weekday,
              e.target.checked ? [defaultTimeRange()] : null
            )
          }}
          minW="140px"
        >
          <strong>
            {format(setDay(new Date(), dayAvailability.weekday), 'cccc')}
          </strong>
        </Checkbox>
        <Spacer display={{ base: 'none', sm: 'block' }} />
        {isSelected ? (
          <VStack alignItems="start">
            {times.map((time, index) => (
              <VStack alignItems="start" key={index}>
                <HStack gap={{ base: 2, md: 4 }}>
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
