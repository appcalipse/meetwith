import {
  Button,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useBoolean,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { addDays, addMinutes, format, isBefore, startOfDay } from 'date-fns'
import React from 'react'
import { FaClock } from 'react-icons/fa'

export interface InputTimePickerProps {
  onChange: (time: number | Date) => void
  currentDate: Date | number
  value: string
  inputProps?: InputProps
  iconColor?: string
  iconSize?: number
}

const generateTimes = (currentDate: Date) => {
  const start = startOfDay(currentDate)
  const end = startOfDay(addDays(new Date(start), 1))
  const interval = 15

  const response = []
  for (
    let cur = start;
    isBefore(cur, end);
    cur = addMinutes(new Date(cur), interval)
  ) {
    response.push(cur)
  }

  return response
}

export const InputTimePicker: React.FC<InputTimePickerProps> = ({
  onChange,
  currentDate,
  value,
  inputProps,
  ...props
}) => {
  const [isEditing, setIsEditing] = useBoolean()
  const iconColor = useColorModeValue('gray.500', props.iconColor || 'gray.200')
  const times = generateTimes(
    typeof currentDate === 'number' ? new Date(currentDate) : currentDate
  ).filter(time => !isBefore(time, new Date()))

  return (
    <Popover
      isOpen={isEditing}
      onOpen={setIsEditing.on}
      onClose={setIsEditing.off}
      closeOnBlur={true}
      isLazy
      lazyBehavior="keepMounted"
    >
      <PopoverTrigger>
        <InputGroup>
          <InputLeftElement
            pointerEvents="none"
            insetY={0}
            left={1}
            height="100%"
            alignItems="center"
            children={
              <Icon
                fontSize={props.iconSize || '16'}
                color={iconColor}
                _groupHover={{
                  color: iconColor,
                }}
                as={FaClock}
              />
            }
          />

          <Input
            cursor="pointer"
            id="time"
            sx={{ paddingLeft: inputProps?.pl || '36px' }}
            placeholder="Time"
            type="text"
            value={value}
            readOnly
            {...inputProps}
          />
        </InputGroup>
      </PopoverTrigger>

      <PopoverContent maxWidth={'200px'}>
        <PopoverArrow />
        <PopoverBody>
          <VStack
            sx={{ maxHeight: '300px', overflowY: 'scroll' }}
            alignItems="flex-start"
            justifyContent="flex-start"
            width={'100%'}
            pl={2}
          >
            {times.map(it => (
              <Button
                variant="ghost"
                isDisabled={isBefore(it, new Date())}
                key={it.toString()}
                onClick={() => {
                  onChange(it)
                  setIsEditing.off()
                }}
                _hover={{ color: 'primary.500' }}
              >
                <Text>{format(it, 'p')}</Text>
              </Button>
            ))}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
