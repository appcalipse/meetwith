import {
  Checkbox,
  HStack,
  IconButton,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format, setDay } from 'date-fns'
import { useEffect, useState } from 'react'
import { FaPlus, FaTrash } from 'react-icons/fa'
import { DayAvailability, TimeRange } from '../../types/Account'
import { defaultTimeRange } from '../../utils/calendar_manager'
import { TimeSelector } from './time-selector'

type WeekdayConfigProps = {
  dayAvailability: DayAvailability
  onChange: (weekday: number, times: TimeRange[]) => void
}

const getNewSlotEnd = (start: string) => {
  const [hours, minutes] = start.split(':')

  const hoursToNum = Number(hours)

  if (hoursToNum === 23) return '24:00'

  return `${String(hoursToNum + 1).padStart(2, '0')}:${minutes}`
}

export const WeekdayConfig: React.FC<WeekdayConfigProps> = props => {
  const [isSelected, setSelected] = useState(
    props.dayAvailability.ranges.length > 0
  )

  const [error, setError] = useState([])

  const [times, setTimes] = useState(
    props.dayAvailability.ranges.sort(
      (a, b) =>
        Number(a.start.split(':').join('')) -
        Number(b.start.split(':').join(''))
    )
  )

  const handleChangeTime = (index: number, start: string, end: string) => {
    const newTimes = [...times]
    newTimes[index] = { start, end }
    setTimes(newTimes)
  }

  const handleAddSlotClick = () => {
    const start = times[times.length - 1].end

    setTimes([
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
    setTimes(newTimes)
    if (newTimes.length === 0) {
      setSelected(false)
    }
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

      {isSelected && !times.some(time => time.end === '24:00') && (
        <IconButton
          color={iconColor}
          aria-label="add"
          icon={<FaPlus size={18} />}
          onClick={handleAddSlotClick}
        />
      )}
    </HStack>
  )
}
