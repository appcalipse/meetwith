import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Link,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { FaApple, FaGoogle, FaMicrosoft, FaPlus } from 'react-icons/fa'

import { ConnectedCalendar, ProviderType } from '../../types/ConnectCalendars'
import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import ConnectedCalendarCard from '../ConnectedCalendars/ConnectedCalendarCard'

const ConnectCalendar = () => {
  const calendarConnections: Array<ConnectedCalendar> = []

  const onSelect = (provider: string) => {
    return provider
  }

  const { isOpen, onOpen, onClose } = useDisclosure()
  const isPro = false
  const textColor = useColorModeValue('gray.700', 'gray.300')
  let content

  if (!isPro) {
    content = (
      <VStack>
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text mb={10} fontSize="lg">
            You didn&apos;t connect any callendar yet
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
  } else if (isPro && calendarConnections.length === 0) {
    content = (
      <VStack>
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text fontSize="lg">You didn&apos;t connect any callendar yet</Text>
        </HStack>
      </VStack>
    )
  } else if (isPro && calendarConnections.length > 0) {
    content = (
      <Box>
        {calendarConnections.map(connection => (
          <ConnectedCalendarCard
            key={connection.provider}
            name={connection.provider}
            email={connection.email}
            icon={connection.icon}
          />
        ))}
      </Box>
    )
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
        disabled={!isPro}
      >
        Add calendar connection
      </Button>
    </Box>
  )
}

export default ConnectCalendar
