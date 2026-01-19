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
import { useRouter } from 'next/router'
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
import { SettingsSection } from '@/types/Dashboard'
import {
  deleteConnectedCalendar,
  getCalendarIntegrationsWithMetadata,
} from '@/utils/api_helper'
import { isTrialEligible } from '@/utils/subscription_manager'

// biome-ignore lint/correctness/noUnusedVariables: No unused vars
const GoProCTA = () => (
  <VStack>
    <Text py="6">
      <Link
        href={`/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}`}
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
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])
  const [canCreateCalendar, setCanCreateCalendar] = useState(true)

  const { isOpen, onOpen, onClose } = useDisclosure()

  // Trial eligibility from account context
  const trialEligible = isTrialEligible(currentAccount)

  const loadCalendars = async () => {
    setLoading(true)
    try {
      const response = await getCalendarIntegrationsWithMetadata()
      const calendars = response.calendars || []
      // for old version without the calendars property
      const formattedCalendars = calendars.map(
        (calendar: ConnectedCalendarCore) => ({
          ...calendar,
          calendars: calendar.calendars,
        })
      )
      setCalendarConnections(formattedCalendars)
      setCanCreateCalendar(!response.upgradeRequired)
      setLoading(false)
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCalendars()
  }, [currentAccount])

  if (loading) {
    return (
      <HStack minH={'450px'} w={'100%'} justifyContent="center">
        <VStack alignItems="center">
          <Image
            src="/assets/no_calendars.svg"
            height="200px"
            alt="Loading..."
          />
          <HStack pt={8}>
            <Spinner />
            <Text fontSize="lg">Checking your calendars...</Text>
          </HStack>
        </VStack>
      </HStack>
    )
  }

  const activeCalendarConnections = calendarConnections

  const disabledCalendarConnections: Array<ConnectedCalendarCore> = []

  return (
    <Box mb={8}>
      <VStack alignItems="flex-start" mb={6}>
        <Heading fontSize="2xl">Connected Calendars</Heading>
        <Text>
          When you connect a calendar we will use its events to block your
          availabilities and also to add your new events to it.
        </Text>
      </VStack>

      <VStack align="flex-start" spacing={2} mb={7}>
        <Button
          onClick={onOpen}
          colorScheme="primary"
          alignSelf="flex-start"
          leftIcon={<FaPlus />}
          isDisabled={!canCreateCalendar}
          title={
            !canCreateCalendar
              ? 'Upgrade to Pro to connect more calendars'
              : undefined
          }
        >
          Add calendar connection
        </Button>
        {!canCreateCalendar && currentAccount && (
          <Text fontSize="14px" color="neutral.400">
            Unlock unlimited calendar connections with PRO.{' '}
            <Button
              variant="link"
              colorScheme="primary"
              px={0}
              onClick={() => router.push('/dashboard/settings/subscriptions')}
              textDecoration="underline"
              fontSize="14px"
              height="auto"
              minW="auto"
            >
              {trialEligible ? 'Try for free' : 'Go PRO'}
            </Button>
            .
          </Text>
        )}
      </VStack>

      <ConnectedCalendars
        activeCalendarConnections={activeCalendarConnections}
        disabledCalendarConnections={disabledCalendarConnections}
        onDelete={loadCalendars}
      />

      <ConnectCalendarModal
        isOpen={isOpen}
        onClose={onClose}
        refetch={loadCalendars}
      />
    </Box>
  )
}

export default ConnectCalendar
