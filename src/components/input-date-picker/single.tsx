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
  date: Date | number
  disabled?: boolean
  onDateChange: (date: Date) => void
  id?: string
  name?: string
  inputProps?: InputProps
  iconColor?: string
  iconSize?: number
  blockPast?: boolean
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
    selected: typeof date === 'number' ? new Date(date) : date,
  })

  const iconColor = useColorModeValue('gray.500', props.iconColor || 'gray.200')

  return (
    <Popover
      initialFocusRef={initialFocusRef}
      isLazy
      isOpen={popoverOpen}
      onClose={() => setPopoverOpen(false)}
      placement="bottom-start"
      variant="responsive"
    >
      <PopoverTrigger>
        <InputGroup>
          <InputLeftElement
            alignItems="center"
            children={
              <Icon
                _groupHover={{
                  color: iconColor,
                }}
                as={FaCalendarDay}
                color={iconColor}
                fontSize={props.iconSize || '16'}
              />
            }
            height="100%"
            insetY={0}
            left={1}
            pointerEvents="none"
          />
          <Input
            autoComplete="off"
            cursor="pointer"
            id={id}
            isDisabled={disabled}
            name={name}
            onChange={e => e.target.value}
            onClick={() => setPopoverOpen(!popoverOpen)}
            ref={initialFocusRef}
            value={format(date, 'P')}
            {...inputProps}
          />
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent ref={ref} width="100%">
        <PopoverBody>
          <CalendarPanel blockPast renderProps={dayzedData} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
