import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useBoolean,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import React from 'react'
import { FaClock } from 'react-icons/fa'

export interface InputTimePickerProps {
  onChange: (time: string) => void
  value: string
}

const generateTimes = () => {
  const start = dayjs().startOf('day')
  const end = dayjs(start).add(1, 'day').startOf('day')
  const interval = 15

  const response = []
  for (
    let cur = start;
    cur.isBefore(end);
    cur = dayjs(cur).add(interval, 'minutes')
  ) {
    response.push(cur.format('HH:mm'))
  }

  return response
}

export const InputTimePicker: React.FC<InputTimePickerProps> = ({
  onChange,
  value,
}) => {
  const [isEditing, setIsEditing] = useBoolean()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const times = generateTimes()

  return (
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
      <Popover
        isOpen={isEditing}
        onOpen={setIsEditing.on}
        onClose={setIsEditing.off}
        closeOnBlur={false}
        isLazy
        lazyBehavior="keepMounted"
      >
        <HStack>
          <PopoverTrigger>
            <Input
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
          </PopoverTrigger>
        </HStack>

        <PopoverContent>
          <PopoverArrow />
          <PopoverBody>
            <VStack sx={{ maxHeight: '300px', overflowY: 'scroll' }}>
              {times.map((it, idx) => (
                <Link
                  key={it}
                  onClick={() => {
                    onChange(it)
                    setIsEditing.off()
                  }}
                >
                  <Box>{it}</Box>
                </Link>
              ))}
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </InputGroup>
  )
}
