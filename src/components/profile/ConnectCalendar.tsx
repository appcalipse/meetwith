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
import { FaPlus } from 'react-icons/fa'

import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import ConnectedCalendarCard from '../ConnectedCalendars/ConnectedCalendarCard'

const ConnectCalendar = () => {
  enum Services {
    Google = 'Google',
    iCloud = 'iCloud',
    Outlook = 'Outlook',
    Office365 = 'Office 365',
  }

  interface calendarConnectionsProps {
    name: Services
    email: string
  }

  const calendarConnections: Array<calendarConnectionsProps> = [
    {
      name: Services.Google,
      email: 'savioabfialho@gmail.com',
    },
    {
      name: Services.iCloud,
      email: 'savioabfialho@gmail.com',
    },
  ]

  const { isOpen, onOpen, onClose } = useDisclosure()
  const isPro = false
  let content

  if (!isPro) {
    content = (
      <VStack>
        <Image src="/assets/no_calendars.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text mb={10} fontSize="lg">
            {"You didn't connect any callendar yet"}
          </Text>
        </HStack>
        <Text>
          <Link color="orange" fontWeight="bold">
            Go PRO
          </Link>{' '}
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
          <Text fontSize="lg">{"You didn't connect any callendar yet"}</Text>
        </HStack>
      </VStack>
    )
  } else if (isPro && calendarConnections.length > 0) {
    content = (
      <Box>
        {calendarConnections.map(connection => (
          <ConnectedCalendarCard
            key={connection.name}
            name={connection.name}
            email={connection.email}
          />
        ))}
      </Box>
    )
  }

  return (
    <Box>
      <VStack alignItems="flex-start" mb={8}>
        <Heading
          fontSize="3xl"
          color={useColorModeValue('gray.700', 'gray.300')}
        >
          Connected calendars
        </Heading>
        <Text color={useColorModeValue('gray.700', 'gray.300')}>
          When you connect a calendar we will use its events to block your
          availabilities and also to add your new events to it.
        </Text>
      </VStack>

      {content}

      <ConnectCalendarModal isOpen={isOpen} onClose={onClose} />

      <Button
        onClick={onOpen}
        colorScheme="orange"
        isFullWidth={false}
        float={'left'}
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
