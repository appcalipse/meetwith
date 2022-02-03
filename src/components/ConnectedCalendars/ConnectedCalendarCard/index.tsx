import {
  Avatar,
  Button,
  Heading,
  HStack,
  Stack,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { FaUnlink } from 'react-icons/fa'

import DisconnectCalendarDialog from '../DisconnectCalendarDialog'

const ConnectedCalendarCard: React.FC<{
  name: string
  email: string
}> = props => {
  const { isOpen, onOpen, onClose } = useDisclosure()

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
          <Avatar
            size="lg"
            bg={useColorModeValue('gray.700', 'gray.500')}
            src={'/assets/' + props.name + '.svg'}
          ></Avatar>
          <VStack alignItems="flex-start" justifyContent="space-around">
            <Heading
              fontSize="xl"
              color={useColorModeValue('gray.700', 'gray.300')}
            >
              {props.name}
            </Heading>
            <Text
              size="xs"
              color={useColorModeValue('gray.700', 'gray.300')}
              isTruncated
              maxWidth="200"
            >
              {props.email}
            </Text>
          </VStack>
        </HStack>
        <Stack>
          <Button
            onClick={onOpen}
            leftIcon={<FaUnlink />}
            variant="link"
            color={useColorModeValue('gray.700', 'gray.300')}
          >
            Disconnect
          </Button>
        </Stack>
        <DisconnectCalendarDialog isOpen={isOpen} onClose={onClose} />
      </HStack>

      <HStack justifyContent="flex-start">
        <Switch size="lg" colorScheme="orange" mr="4"></Switch>
        <Text color={useColorModeValue('gray.700', 'gray.300')}>
          Add new meet with wallet events to this calendar
        </Text>
      </HStack>
    </Stack>
  )
}

export default ConnectedCalendarCard
