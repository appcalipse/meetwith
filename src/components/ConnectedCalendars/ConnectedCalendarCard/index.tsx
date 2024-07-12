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
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { ChangeEvent, useState } from 'react'
import { IconType } from 'react-icons'
import { FaUnlink } from 'react-icons/fa'

import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { updateConnectedCalendar } from '@/utils/api_helper'

import DisconnectCalendarDialog from '../DisconnectCalendarDialog'
import { MultipleCalendarList } from '../MultipleCalendarList'

export interface ConnectedCalendarCardProps {
  provider: TimeSlotSource
  email: string
  icon: IconType
  calendars: CalendarSyncInfo[]
  onDelete: () => Promise<void>
}

const ConnectedCalendarCard: React.FC<ConnectedCalendarCardProps> = props => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [isUpdating, setUpdating] = useState(false)
  const [calendars, setCalendars] = useState(
    props.calendars.map(c => {
      return { ...c, loading: false }
    })
  )

  const onSwitch = async (evt: ChangeEvent<HTMLInputElement>) => {
    setUpdating(true)

    const connection = await updateConnectedCalendar(
      props.email,
      props.provider,
      [{ ...calendars[0], sync: evt.target.checked }]
    )

    setCalendars(
      connection.calendars!.map(c => {
        return { ...c, loading: false }
      })
    )

    setUpdating(false)
  }

  const toast = useToast()

  const updateCalendars = async (
    _calendars: (CalendarSyncInfo & { loading: boolean })[],
    index: number
  ) => {
    const currentCalendars = JSON.parse(JSON.stringify(calendars))

    _calendars[index].loading = true
    setCalendars(_calendars)
    try {
      await updateConnectedCalendar(props.email, props.provider, _calendars)
      _calendars[index].loading = false
      setCalendars([..._calendars]) //force update with spread operator
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'There was an error updating the calendar connection',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
      setCalendars(currentCalendars)
      return
    }
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
      minWidth="335px"
      bgColor={bgColor}
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
              {props.provider}
            </Heading>
            <Text size="xs" color={textColor} isTruncated>
              {props.email}
            </Text>
          </VStack>
        </HStack>
        <Button
          display={{ base: 'none', md: 'flex' }}
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

      {calendars.length > 1 && (
        <MultipleCalendarList
          calendars={calendars}
          updateCalendars={updateCalendars}
        />
      )}

      {calendars.length == 1 && (
        <HStack justifyContent="flex-start">
          <Switch
            size="lg"
            colorScheme="primary"
            mr="4"
            onChange={onSwitch}
            isChecked={calendars[0].sync}
            isDisabled={isUpdating}
          ></Switch>
          <Text color={textColor}>
            Add new Meet with Wallet events to this calendar
          </Text>
          {isUpdating ? <Spinner /> : false}
        </HStack>
      )}

      <Button
        display={{ base: 'flex', md: 'none' }}
        onClick={onOpen}
        leftIcon={<FaUnlink />}
        variant="outline"
        color={textColor}
        mt={2}
      >
        Disconnect
      </Button>
    </Stack>
  )
}

export { ConnectedCalendarCard }
