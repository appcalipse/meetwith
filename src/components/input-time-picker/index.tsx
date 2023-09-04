import {
  Button,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
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
  onChange: (time: string) => void
  currentDate: Date
  value: string
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
}) => {
  const [isEditing, setIsEditing] = useBoolean()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const times = generateTimes(currentDate)

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
            children={
              <Icon
                fontSize="16"
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
            sx={{ paddingLeft: '36px' }}
            placeholder="Time"
            type="text"
            value={value}
            onChange={ev => {
              onChange(ev.target.value)
              setIsEditing.off()
            }}
          />
        </InputGroup>
      </PopoverTrigger>

      <PopoverContent>
        <PopoverArrow />
        <PopoverBody>
          <VStack sx={{ maxHeight: '300px', overflowY: 'scroll' }}>
            {times.map(it => (
              <Button
                width="100%"
                variant="ghost"
                isDisabled={isBefore(it, new Date())}
                key={it.toString()}
                onClick={() => {
                  console.log(isBefore(it, new Date()))
                  onChange(format(it, 'p'))
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
