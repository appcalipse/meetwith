import {
  Button,
  Circle,
  Heading,
  HStack,
  Icon,
  Spinner,
  Stack,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { ChangeEvent, ChangeEventHandler } from 'react'
import { IconType } from 'react-icons'
import { FaUnlink } from 'react-icons/fa'

import { AccountContext } from '../../../providers/AccountProvider'
import { ConnectedCalendarProvider } from '../../../types/CalendarConnections'
import { updateConnectedCalendarSync } from '../../../utils/api_helper'
import DisconnectCalendarDialog from '../DisconnectCalendarDialog'

const ConnectedCalendarCard: React.FC<{
  name: ConnectedCalendarProvider
  email: string
  icon: IconType
  sync: boolean
  onDelete: (
    email: string,
    provider: ConnectedCalendarProvider
  ) => Promise<void>
}> = props => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const [isUpdating, setUpdating] = useState(false)

  const onSwitch = async (evt: ChangeEvent<HTMLInputElement>) => {
    setUpdating(true)
    await updateConnectedCalendarSync(
      props.email,
      props.name,
      evt.target.checked
    )
    setUpdating(false)
  }

  return (
    <Stack
      p="4"
      boxShadow="lg"
      mb="8"
      width="100%"
      borderRadius="lg"
      justifyContent="space-between"
      flexWrap="wrap"
      minWidth="360px"
    >
      <HStack justifyContent="space-between" mb="8">
        <HStack>
          <Circle
            size="60px"
            bg={useColorModeValue('gray.700', 'gray.500')}
            mr="4"
          >
            <Icon as={props.icon} fontSize="25" color="white" />
          </Circle>
          <VStack alignItems="flex-start" justifyContent="space-around">
            <Heading fontSize="xl" color={textColor}>
              {props.name}
            </Heading>
            <Text size="xs" color={textColor} isTruncated maxWidth="200">
              {props.email}
            </Text>
          </VStack>
        </HStack>
        <Stack>
          <Button
            onClick={onOpen}
            leftIcon={<FaUnlink />}
            variant="link"
            color={textColor}
          >
            Disconnect
          </Button>
        </Stack>
        <DisconnectCalendarDialog
          isOpen={isOpen}
          onClose={onClose}
          onDelete={() => props.onDelete(props.email, props.name)}
        />
      </HStack>

      <HStack justifyContent="flex-start">
        <Switch
          size="lg"
          colorScheme="orange"
          mr="4"
          onChange={onSwitch}
          defaultChecked={props.sync}
          disabled={isUpdating}
        ></Switch>
        <Text color={textColor}>
          Add new meet with wallet events to this calendar
        </Text>
        {isUpdating ? <Spinner /> : false}
      </HStack>
    </Stack>
  )
}

export default ConnectedCalendarCard
