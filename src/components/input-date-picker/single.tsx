import {
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useColorModeValue,
  useOutsideClick,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { useDayzed } from 'dayzed'
import React, { useRef, useState } from 'react'
import { FaCalendarDay } from 'react-icons/fa'

import { OnDateSelected } from '.'
import { CalendarPanel } from './components/calendarPanel'

export interface SingleDatepickerProps {
  date: Date
  disabled?: boolean
  onDateChange: (date: Date) => void
  id?: string
  name?: string
  inputProps?: InputProps
}

export const SingleDatepicker: React.FC<SingleDatepickerProps> = ({
  inputProps,
  ...props
}) => {
  const { date, name, disabled, onDateChange, id } = props

  // chakra popover utils
  const ref = useRef<HTMLElement>(null)
  const initialFocusRef = useRef<HTMLInputElement>(null)

  const [popoverOpen, setPopoverOpen] = useState(false)

  useOutsideClick({
    ref: ref,
    handler: () => setPopoverOpen(false),
  })

  // dayzed utils
  const handleOnDateSelected: OnDateSelected = ({ selectable, date }) => {
    if (!selectable) return
    if (date instanceof Date && !isNaN(date.getTime())) {
      onDateChange(date)
      setPopoverOpen(false)
      return
    }
  }

  const dayzedData = useDayzed({
    showOutsideDays: true,
    onDateSelected: handleOnDateSelected,
    selected: date,
  })

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  return (
    <Popover
      placement="bottom-start"
      variant="responsive"
      isOpen={popoverOpen}
      onClose={() => setPopoverOpen(false)}
      initialFocusRef={initialFocusRef}
      isLazy
    >
      <PopoverTrigger>
        <InputGroup>
          <InputLeftElement
            pointerEvents="none"
            children={
              <Icon
                fontSize="16"
                color={iconColor}
                _groupHover={{
                  color: iconColor,
                }}
                as={FaCalendarDay}
              />
            }
          />
          <Input
            id={id}
            autoComplete="off"
            isDisabled={disabled}
            ref={initialFocusRef}
            onClick={() => setPopoverOpen(!popoverOpen)}
            name={name}
            value={format(date, 'P')}
            onChange={e => e.target.value}
            {...inputProps}
          />
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent ref={ref} width="100%">
        <PopoverBody>
          <CalendarPanel renderProps={dayzedData} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
