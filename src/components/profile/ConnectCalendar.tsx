import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import ConnectCalendarModal from '@/components/ConnectedCalendars/ConnectCalendarModal'
import { ConnectedCalendarCard } from '@/components/ConnectedCalendars/ConnectedCalendarCard'
import { DisabledCalendarCard } from '@/components/ConnectedCalendars/DisabledCalendarCard'
import { Account } from '@/types/Account'
import {
  ConnectedCalendarCore,
  ConnectedCalendarIcons,
} from '@/types/CalendarConnections'
import {
  deleteConnectedCalendar,
  listConnectedCalendars,
} from '@/utils/api_helper'
import { isProAccount } from '@/utils/subscription_manager'

const GoProCTA = () => (
  <VStack>
    <Text py="6">
      <Link
        href="/dashboard/details#subscriptions"
        colorScheme="primary"
        fontWeight="bold"
      >
        Go PRO
      </Link>{' '}
      and connect as many calendars you want (Google, iCloud, Office or any that
      supports WebDAV interface)
    </Text>
  </VStack>
)

const ConnectedCalendars: React.FC<{
  activeCalendarConnections: ConnectedCalendarCore[]
  disabledCalendarConnections: ConnectedCalendarCore[]
  onDelete: () => Promise<void>
}> = ({ activeCalendarConnections, disabledCalendarConnections, onDelete }) => {
  if (!activeCalendarConnections || activeCalendarConnections.length === 0) {
    return (
      <VStack>
        <Image
          src="/assets/no_calendars.svg"
          height="200px"
          alt="No calendars connected"
        />
        <HStack pt={8}>
          <Text fontSize="lg">
            You haven&lsquo;t connected any calendar yet
          </Text>
        </HStack>
      </VStack>
    )
  }

  return (
    <Box>
      {activeCalendarConnections.map((connection, idx) => (
        <ConnectedCalendarCard
          key={`connected-${connection.provider}-${idx}`}
          provider={connection.provider}
          email={connection.email}
          icon={ConnectedCalendarIcons[connection.provider]}
          calendars={connection.calendars!}
          expectedPermissions={connection.expectedPermissions || 0}
          grantedPermissions={connection.grantedPermissions || 0}
          onDelete={async () => {
            await deleteConnectedCalendar(connection.email, connection.provider)
            await onDelete()
          }}
        />
      ))}

      {disabledCalendarConnections.length > 0 && (
        <Text py="6">
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

const ConnectCalendar: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [loading, setLoading] = useState(true)
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])

  const { isOpen, onOpen, onClose } = useDisclosure()

  const loadCalendars = async () => {
    setLoading(true)
    return listConnectedCalendars()
      .then(data => {
        // for old version without the calendars property
        const calendars = data?.map((calendar: ConnectedCalendarCore) => ({
          ...calendar,
          calendars: calendar.calendars,
        }))
        setCalendarConnections(calendars)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCalendars()
  }, [currentAccount])

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

  const activeCalendarConnections = calendarConnections

  const disabledCalendarConnections: Array<ConnectedCalendarCore> = []

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

      <Button
        onClick={onOpen}
        colorScheme="primary"
        mb={4}
        mt={4}
        alignSelf="flex-start"
        leftIcon={<FaPlus />}
      >
        Add calendar connection
      </Button>
    </Box>
  )
}

export default ConnectCalendar
