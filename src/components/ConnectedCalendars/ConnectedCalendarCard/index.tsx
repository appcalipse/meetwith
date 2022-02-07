import {
  Button,
  Circle,
  Heading,
  HStack,
  Icon,
  Stack,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { IconType } from 'react-icons'
import { FaUnlink } from 'react-icons/fa'

import { ConnectedCalendarProvider } from '../../../types/CalendarConnections'
import DisconnectCalendarDialog from '../DisconnectCalendarDialog'

const ConnectedCalendarCard: React.FC<{
  name: ConnectedCalendarProvider
  email: string
  icon: IconType
  onDelete: (email: string, provider: ConnectedCalendarProvider) => void
}> = props => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const textColor = useColorModeValue('gray.700', 'gray.300')

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
        <Switch size="lg" colorScheme="orange" mr="4"></Switch>
        <Text color={textColor}>
          Add new meet with wallet events to this calendar
        </Text>
      </HStack>
    </Stack>
  )
}

export default ConnectedCalendarCard
