import {
  Box,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format, setDay } from 'date-fns'
import { FaCopy, FaPlusCircle, FaTrash } from 'react-icons/fa'

import { TimeRange } from '@/types/Account'
import {
  validateTimeFormat,
  validateTimeRange,
} from '@/utils/availability.helper'

import { TimeSelector } from './TimeSelector'

type DayAvailability = {
  weekday: number
  ranges: TimeRange[]
}

type WeekdayConfigProps = {
  dayAvailability: DayAvailability
  onChange: (weekday: number, times: TimeRange[] | null) => void
  onCopyToDays?: (
    sourceWeekday: number,
    ranges: TimeRange[],
    copyType: 'all' | 'weekdays' | 'weekends'
  ) => void
  useDirectInput?: boolean
  onValidationChange?: (weekday: number, isValid: boolean) => void
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

const getNextSlotStart = (end: string) => {
  const [hours, minutes] = end.split(':')
  const nextHours = (parseInt(hours) + 1).toString().padStart(2, '0')
  return `${nextHours}:${minutes}`
}

const TimeSelectorError: React.FC<{ start: string; end: string }> = ({
  start,
  end,
}) => {
  const isValid =
    validateTimeFormat(start) &&
    validateTimeFormat(end) &&
    validateTimeRange(start, end)

  if (isValid) return null

  return (
    <Text fontSize="xs" color="red.500">
      Start time must be before end time
    </Text>
  )
}

export const WeekdayConfig: React.FC<WeekdayConfigProps> = props => {
  const {
    dayAvailability,
    onChange,
    onCopyToDays,
    useDirectInput = false,
    onValidationChange,
  } = props
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const borderColor = useColorModeValue('gray.300', 'gray.700')

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

  const handleValidationChange = (index: number, isValid: boolean) => {
    if (onValidationChange) {
      onValidationChange(dayAvailability.weekday, isValid)
    }
  }

  const handleAddSlotClick = () => {
    const lastSlot = times[times.length - 1]
    const start = getNextSlotStart(lastSlot.end)

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

  const handleCopyToDays = (copyType: 'all' | 'weekdays' | 'weekends') => {
    if (onCopyToDays && isSelected) {
      onCopyToDays(dayAvailability.weekday, times, copyType)
    }
  }

  return (
    <Box py={3} width="100%" borderBottom="1px solid" borderColor={borderColor}>
      {/* Header Row */}
      <Flex
        justify="space-between"
        align="center"
        flexDirection={{ base: 'column', sm: 'row' }}
        gap={{ base: 2, sm: 0 }}
      >
        <Checkbox
          colorScheme="orange"
          isChecked={isSelected}
          onChange={e => {
            onChange(
              dayAvailability.weekday,
              e.target.checked ? [defaultTimeRange()] : null
            )
          }}
          minW="140px"
          _focus={{ boxShadow: 'none', border: 'none' }}
          _focusVisible={{ boxShadow: 'none', border: 'none' }}
          sx={{
            '& .chakra-checkbox__control': {
              borderColor: 'neutral.800',
              borderRadius: '4px',
              _checked: {
                bg: 'primary.200',
                borderColor: 'primary.200 !important',
                border: '2px solid !important',
                borderRadius: '4px',
                transform: 'scale(1.1)',
                _hover: {
                  bg: 'primary.200',
                  borderColor: 'primary.200 !important',
                  border: '2px solid !important',
                  borderRadius: '4px',
                  transform: 'scale(1.1)',
                },
              },
              _hover: {
                borderColor: 'neutral.700',
                borderRadius: '4px',
              },
              _focus: {
                borderColor: 'neutral.700',
                borderRadius: '4px',
                boxShadow: 'none !important',
              },
            },
          }}
        >
          <strong>
            {format(setDay(new Date(), dayAvailability.weekday), 'cccc')}
          </strong>
        </Checkbox>

        {/* Action Buttons */}
        {isSelected && (
          <HStack spacing={1} flexShrink={0}>
            {onCopyToDays && (
              <Menu>
                <Tooltip
                  label="Copy time slots to other days"
                  placement="top"
                  hasArrow
                  bg="neutral.800"
                  color="neutral.0"
                  borderRadius="md"
                  fontSize="sm"
                  px={3}
                  py={2}
                >
                  <MenuButton
                    as={IconButton}
                    color={iconColor}
                    aria-label="copy to other days"
                    icon={<FaCopy size={16} />}
                    size="sm"
                    variant="ghost"
                  />
                </Tooltip>
                <MenuList>
                  <MenuItem onClick={() => handleCopyToDays('all')}>
                    Copy to all other days
                  </MenuItem>
                  <MenuItem onClick={() => handleCopyToDays('weekdays')}>
                    Copy to weekdays (Mon-Fri)
                  </MenuItem>
                  <MenuItem onClick={() => handleCopyToDays('weekends')}>
                    Copy to weekends (Sat-Sun)
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        )}
      </Flex>

      {/* Time Slots */}
      {isSelected ? (
        <VStack align="start" spacing={2} width="100%">
          {times.map((time, index) => (
            <VStack key={index} align="start" spacing={1} width="100%">
              <Flex
                width="100%"
                align="center"
                gap={2}
                flexDirection={{ base: 'column', sm: 'row' }}
              >
                <TimeSelector
                  onChange={handleChangeTime}
                  index={index}
                  start={time.start}
                  end={time.end}
                  useDirectInput={useDirectInput}
                  onValidationChange={handleValidationChange}
                  {...(index > 0 && { previousEnd: times[index - 1].end })}
                  {...(index < times.length - 1 && {
                    nextStart: times[index + 1].start,
                  })}
                />
                <HStack spacing={1}>
                  <Tooltip
                    label="Remove time slot"
                    placement="top"
                    hasArrow
                    bg="neutral.800"
                    color="neutral.0"
                    borderRadius="md"
                    fontSize="sm"
                    px={3}
                    py={2}
                  >
                    <IconButton
                      color={iconColor}
                      aria-label="remove time slot"
                      icon={<FaTrash size={14} />}
                      onClick={() => handleTimeRemoveClick(index)}
                      size="sm"
                      variant="ghost"
                      flexShrink={0}
                      minW="32px"
                      h="32px"
                    />
                  </Tooltip>
                  {index === 0 && (
                    <Tooltip
                      label="Add another time slot"
                      placement="top"
                      hasArrow
                      bg="neutral.800"
                      color="neutral.0"
                      borderRadius="md"
                      fontSize="sm"
                      px={3}
                      py={2}
                    >
                      <IconButton
                        color={iconColor}
                        aria-label="add time slot"
                        icon={<FaPlusCircle size={14} />}
                        onClick={handleAddSlotClick}
                        size="sm"
                        variant="ghost"
                        flexShrink={0}
                        minW="32px"
                        h="32px"
                      />
                    </Tooltip>
                  )}
                </HStack>
              </Flex>
              {useDirectInput && (
                <TimeSelectorError start={time.start} end={time.end} />
              )}
            </VStack>
          ))}
        </VStack>
      ) : (
        <Text color="neutral.300" fontSize="sm" ml={6}>
          Not available
        </Text>
      )}
    </Box>
  )
}
