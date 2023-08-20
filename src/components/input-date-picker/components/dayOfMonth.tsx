import { Button } from '@chakra-ui/react'
import { DateObj, RenderProps } from 'dayzed'
import React from 'react'

interface DayOfMonthProps {
  renderProps: RenderProps
  isInRange?: boolean | null
  dateObj: DateObj
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement> | undefined
  disabled?: boolean
}

export const DayOfMonth: React.FC<DayOfMonthProps> = ({
  dateObj,
  isInRange,
  renderProps,
  onMouseEnter,
  disabled,
}) => {
  const { date, selected, selectable, today } = dateObj
  const { getDateProps } = renderProps
  let bg = selected || isInRange ? 'primary.200' : 'transparent'
  bg = !selectable ? 'gray.200' : bg
  const halfGap = 0.125 //default Chakra-gap-space-1 is 0.25rem
  return (
    <Button
      {...getDateProps({
        dateObj,
        disabled: !selectable,
        onMouseEnter: onMouseEnter,
      })}
      isDisabled={!selectable}
      size="sm"
      variant="outline"
      bg={bg}
      _hover={{
        bg: 'primary.500',
      }}
      // this intends to fill the visual gap from Grid to improve the UX
      // so the button active area is actually larger than when it's seen
      _after={{
        content: "''",
        position: 'absolute',
        top: `-${halfGap}rem`,
        left: `-${halfGap}rem`,
        bottom: `-${halfGap}rem`,
        right: `-${halfGap}rem`,
        borderWidth: `${halfGap}rem`,
        borderColor: 'transparent',
      }}
      borderColor={today ? 'primary.500' : 'transparent'}
    >
      {selectable ? date.getDate() : 'X'}
    </Button>
  )
}
