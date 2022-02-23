import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Link,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import {
  ConnectedCalendarCore,
  ConnectedCalendarIcons,
  ConnectedCalendarProvider,
} from '../../types/CalendarConnections'
import {
  deleteConnectedCalendar,
  getGoogleAuthConnectUrl,
  listConnectedCalendars,
} from '../../utils/api_helper'
import { isProAccount } from '../../utils/subscription_manager'
import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import ConnectedCalendarCard from '../ConnectedCalendars/ConnectedCalendarCard'

const ConnectCalendar = () => {
  const [loading, setLoading] = useState(true)
  const [firstFetch, setFirstFetch] = useState(true)
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])

  const { currentAccount } = useContext(AccountContext)

  const loadCalendars = async () => {
    setLoading(true)
    return listConnectedCalendars()
      .then(data => {
        setCalendarConnections(data)
        setLoading(false)
        setFirstFetch(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCalendars()
  }, [])

  const onSelect = async (provider: ConnectedCalendarProvider) => {
    switch (provider) {
      case ConnectedCalendarProvider.GOOGLE:
        const { url } = await getGoogleAuthConnectUrl()
        window.location.assign(url)
        break
      default:
        throw new Error(`Invalid provider selected: ${provider}`)
    }
    return
  }

  const onDelete = async (
    email: string,
    provider: ConnectedCalendarProvider
  ) => {
    await deleteConnectedCalendar(email, provider)
    await loadCalendars()
  }

  const { isOpen, onOpen, onClose } = useDisclosure()
  const textColor = useColorModeValue('gray.700', 'gray.300')
  let content

  const proAccount = isProAccount(currentAccount!)

  if (!proAccount) {
    content = (
      <VStack>
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text mb={10} fontSize="lg">
            You haven&apos;t connected any calendar yet
          </Text>
        </HStack>
        <Text>
          <Link
            rel="pricing"
            href="/#pricing"
            colorScheme="orange"
            fontWeight="bold"
          >
            Go PRO&nbsp;
          </Link>
          and start connecting as many calendars you want (Google, iCloud,
          Outlook or Office).
        </Text>
      </VStack>
    )
  } else {
    if (firstFetch) {
      content = (
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
      )
    } else if (calendarConnections.length === 0) {
      content = (
        <VStack>
          <Image
            src="/assets/no_calendars.svg"
            height="200px"
            alt="Loading..."
          />
          <HStack pt={8}>
            <Text fontSize="lg">You didn&apos;t connect any calendar yet</Text>
          </HStack>
        </VStack>
      )
    } else if (calendarConnections.length > 0) {
      content = (
        <Box>
          {calendarConnections.map((connection, idx) => (
            <ConnectedCalendarCard
              key={`connected-${connection.provider}-${idx}`}
              name={connection.provider}
              email={connection.email}
              icon={ConnectedCalendarIcons[connection.provider]}
              onDelete={onDelete}
              sync={connection.sync}
            />
          ))}
        </Box>
      )
    }
  }

  return (
    <Box>
      <VStack alignItems="flex-start" mb={8}>
        <Heading fontSize="3xl" color={textColor}>
          Connected calendars
        </Heading>
        <Text color={textColor}>
          When you connect a calendar we will use its events to block your
          availabilities and also to add your new events to it.
        </Text>
      </VStack>

      {content}

      <ConnectCalendarModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={onSelect}
      />

      <Button
        onClick={onOpen}
        colorScheme="orange"
        isFullWidth={false}
        mb={4}
        mt={4}
        alignSelf="flex-start"
        leftIcon={<FaPlus />}
        disabled={!proAccount}
      >
        Add calendar connection
      </Button>
    </Box>
  )
}

export default ConnectCalendar
