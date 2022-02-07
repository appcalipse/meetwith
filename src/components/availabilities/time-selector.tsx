import { HStack, Select, Text } from '@chakra-ui/react'
import { ChangeEvent } from 'react'

import { allSlots } from '../../utils/calendar_manager'

type SelectorProps = {
  onChange: (time: string) => void
  time: string
  slots: string[]
}

const Selector: React.FC<SelectorProps> = ({ onChange, time, slots }) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value)
  }

  return (
    <Select value={time} onChange={handleChange} width="96px">
      {slots.map(time => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  )
}

type TimeSelectorProps = {
  index: number
  onChange: (index: number, start: string, end: string) => void
  start: string
  end: string
  nextStart?: string
  previousEnd?: string
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  index,
  onChange,
  start,
  end,
  nextStart = '24:00',
  previousEnd = '00:00',
}) => {
  const slots = {
    start: allSlots.slice(
      allSlots.findIndex(slot => slot === previousEnd),
      allSlots.findIndex(slot => slot === nextStart)
    ),
    end: allSlots.slice(
      allSlots.findIndex(slot => slot === start) + 1,
      allSlots.findIndex(slot => slot === nextStart) + 1
    ),
  }

  const onChangeStart = (time: string) => {
    onChange(index, time, end)
  }

  const onChangeEnd = (time: string) => {
    onChange(index, start, time)
  }

  return (
    <HStack>
      <Selector onChange={onChangeStart} time={start} slots={slots.start} />
      <Text>-</Text>
      <Selector onChange={onChangeEnd} time={end} slots={slots.end} />
    </HStack>
  )
}
