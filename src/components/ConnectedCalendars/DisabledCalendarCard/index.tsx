import {
  Button,
  HStack,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FaUnlink } from 'react-icons/fa'

import { TimeSlotSource } from '@/types/Meeting'

import DisconnectCalendarDialog from '../DisconnectCalendarDialog'

export interface DisabledCalendarCardProps {
  name: TimeSlotSource
  email: string
  onDelete: () => Promise<void>
}

const DisabledCalendarCard: React.FC<DisabledCalendarCardProps> = props => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const textColor = useColorModeValue('gray.700', 'gray.300')

  return (
    <Stack
      boxShadow="lg"
      width="100%"
      borderRadius="lg"
      justifyContent="space-between"
      flexWrap="wrap"
      minWidth="335px"
    >
      <HStack justifyContent="space-between" m="4">
        <VStack alignItems="flex-start" justifyContent="space-around">
          <Text color={textColor} isTruncated>
            {props.name} - {props.email}
          </Text>
        </VStack>
        <Button
          display={{ base: 'none', md: 'block' }}
          onClick={onOpen}
          leftIcon={<FaUnlink />}
          variant="link"
          color={textColor}
        >
          Disconnect
        </Button>
        <DisconnectCalendarDialog
          isOpen={isOpen}
          onClose={onClose}
          onDelete={props.onDelete}
        />
      </HStack>

      <Button
        display={{ base: 'block', md: 'none' }}
        onClick={onOpen}
        leftIcon={<FaUnlink />}
        variant="outline"
        color={textColor}
      >
        Disconnect
      </Button>
    </Stack>
  )
}

export { DisabledCalendarCard }
