import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Link,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import {
  ConnectedCalendarCore,
  ConnectedCalendarIcons,
} from '../../types/CalendarConnections'
import {
  deleteConnectedCalendar,
  listConnectedCalendars,
} from '../../utils/api_helper'
import { isProAccount } from '../../utils/subscription_manager'
import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import { ConnectedCalendarCard } from '../ConnectedCalendars/ConnectedCalendarCard'
import { DisabledCalendarCard } from '../ConnectedCalendars/DisabledCalendarCard'

const GoProCTA = () => (
  <VStack>
    <Text>
      <Link
        rel="pricing"
        href="/#pricing"
        colorScheme="orange"
        fontWeight="bold"
      >
        Go PRO&nbsp;
      </Link>
      and connect as many calendars you want (Google, iCloud, Office or any that
      supports Webdav interface)
    </Text>
  </VStack>
)

const ConnectedCalendars: React.FC<{
  activeCalendarConnections: ConnectedCalendarCore[]
  disabledCalendarConnections: ConnectedCalendarCore[]
  onDelete: () => Promise<void>
}> = ({ activeCalendarConnections, disabledCalendarConnections, onDelete }) => {
  if (activeCalendarConnections.length === 0) {
    return (
      <VStack>
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text fontSize="lg">You didn&apos;t connect any calendar yet</Text>
        </HStack>
      </VStack>
    )
  }

  return (
    <Box>
      {activeCalendarConnections.map((connection, idx) => (
        <ConnectedCalendarCard
          key={`connected-${connection.provider}-${idx}`}
          name={connection.provider}
          email={connection.email}
          icon={ConnectedCalendarIcons[connection.provider]}
          sync={connection.sync}
          onDelete={async () => {
            await deleteConnectedCalendar(connection.email, connection.provider)
            await onDelete()
          }}
        />
      ))}

      {disabledCalendarConnections.length > 0 && (
        <Text>
          Here is a list of your connected calendars that are not active because
          you don&apos;t have a PRO plan active:
        </Text>
      )}
      {disabledCalendarConnections.map((connection, idx) => (
        <DisabledCalendarCard
          key={`connected-${connection.provider}-${idx}`}
          name={connection.provider}
          email={connection.email}
          onDelete={async () => {
            await deleteConnectedCalendar(connection.email, connection.provider)
            await onDelete()
          }}
        />
      ))}
    </Box>
  )
}

const ConnectCalendar = () => {
  const [loading, setLoading] = useState(true)
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])

  const { currentAccount } = useContext(AccountContext)

  const { isOpen, onOpen, onClose } = useDisclosure()

  const loadCalendars = async () => {
    setLoading(true)
    return listConnectedCalendars()
      .then(data => {
        setCalendarConnections(data)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCalendars()
  }, [])

  if (loading) {
    return (
      <VStack alignItems="center">
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking your calendars...</Text>
        </HStack>
      </VStack>
    )
  }

  const isPro = isProAccount(currentAccount!)

  const hasReachedConnectionCountLimit =
    !isPro && calendarConnections.length > 0

  const activeCalendarConnections = isPro
    ? calendarConnections
    : calendarConnections.slice(0, 1)

  const disabledCalendarConnections = isPro ? [] : calendarConnections.slice(1)

  return (
    <Box mb={8}>
      <VStack alignItems="flex-start" mb={8}>
        <Heading fontSize="2xl">Connected Calendars</Heading>
        <Text>
          When you connect a calendar we will use its events to block your
          availabilities and also to add your new events to it.
        </Text>
      </VStack>

      <ConnectedCalendars
        activeCalendarConnections={activeCalendarConnections}
        disabledCalendarConnections={disabledCalendarConnections}
        onDelete={loadCalendars}
      />

      <ConnectCalendarModal isOpen={isOpen} onClose={onClose} />

      {hasReachedConnectionCountLimit && <GoProCTA />}

      <Button
        onClick={onOpen}
        colorScheme="orange"
        isFullWidth={false}
        mb={4}
        mt={4}
        alignSelf="flex-start"
        leftIcon={<FaPlus />}
        disabled={hasReachedConnectionCountLimit}
      >
        Add calendar connection
      </Button>
    </Box>
  )
}

export default ConnectCalendar
