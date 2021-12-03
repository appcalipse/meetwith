import { ReactNode } from 'react'
import {
  Box,
  HStack,
  Heading,
  Flex,
  Text,
  VStack,
  useColorModeValue,
  List,
  ListItem,
  ListIcon,
  Button,
} from '@chakra-ui/react'
import { FaAngry, FaCheckCircle } from 'react-icons/fa'

function PriceWrapper({ children }: { children: ReactNode }) {
  return (
    <Flex
      m={4}
      shadow="base"
      borderWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.500')}
      borderRadius={'xl'}
      flexDirection="column"
      minWidth="360px"
      flex="0 1"
    >
      {children}
    </Flex>
  )
}

export default function Pricing() {
  return (
    <Box pt={12} px={12} id="pricing">
      <VStack spacing={2} textAlign="center">
        <Heading as="h1" fontSize="4xl">
          Options that fit your needs
        </Heading>
        <Text fontSize="lg" color={useColorModeValue('gray.500', 'gray.300')}>
          Start for free, go Pro, or power your DAO with more organization and
          transparency.
        </Text>
      </VStack>
      <Flex justify="center" wrap="wrap" py={10}>
        <PriceWrapper>
          <Box py={4} px={12}>
            <Text fontWeight="500" fontSize="2xl" textAlign="center">
              Free
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                Ξ
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                0
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /forever
              </Text>
            </HStack>
          </Box>
          <VStack
            bg={useColorModeValue('gray.50', 'gray.700')}
            py={4}
            borderBottomRadius={'xl'}
            flex={1}
          >
            <List spacing={3} textAlign="start" px={12}>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Public page for scheduling meetings
              </ListItem>
              <ListItem>
                <ListIcon as={FaAngry} color="red.500" />
                Single meeting configuration
              </ListItem>
              <ListItem>
                <ListIcon as={FaAngry} color="red.500" />
                Fixed booking link with wallet address
              </ListItem>
              <ListItem>
                <ListIcon as={FaAngry} color="red.500" />
                Only 1-1 meetings
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button w="full" colorScheme="orange" variant="outline" disabled>
                Coming soon
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>

        <PriceWrapper>
          {/* <Box position="relative">
                        <Box
                            position="absolute"
                            top="-16px"
                            left="50%"
                            style={{ transform: 'translate(-50%)' }}>
                            <Text
                                textTransform="uppercase"
                                bg={useColorModeValue('gray.300', 'gray.700')}
                                px={3}
                                py={1}
                                color={useColorModeValue('gray.900', 'gray.300')}
                                fontSize="sm"
                                fontWeight="600"
                                rounded="xl">
                                Most Popular
                            </Text>
                        </Box>
                    </Box> */}
          <Box py={4} px={12}>
            <Text fontWeight="500" fontSize="2xl" textAlign="center">
              Pro
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                Ξ
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                0.01
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
          </Box>
          <VStack
            bg={useColorModeValue('gray.50', 'gray.700')}
            py={4}
            borderBottomRadius={'xl'}
            flex={1}
          >
            <List spacing={3} textAlign="start" px={12}>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Unlimited meeting configurations
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Customizable booking link
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                ENS integration
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Meeting Notifications (Email, Push and, EPNS)
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Integrations (Google calendar and iCloud)
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button w="full" colorScheme="orange" variant="outline" disabled>
                Coming soon
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>

        <PriceWrapper>
          <Box py={4} px={12}>
            <Text fontWeight="500" fontSize="2xl" textAlign="center">
              DAO
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                Ξ
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                0.1
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
          </Box>
          <VStack
            bg={useColorModeValue('gray.50', 'gray.700')}
            py={4}
            borderBottomRadius={'xl'}
            flex={1}
          >
            <List spacing={3} textAlign="start" px={12}>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Everything from PRO
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Gated scheduled meetings for members with Allow lists
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button w="full" colorScheme="orange" variant="outline" disabled>
                Coming soon
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>
        <PriceWrapper>
          <Box py={4} px={12}>
            <Text fontWeight="500" fontSize="2xl" textAlign="center">
              Awesome DAO
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                Ξ
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                0.2
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
          </Box>
          <VStack
            bg={useColorModeValue('gray.50', 'gray.700')}
            py={4}
            borderBottomRadius={'xl'}
            flex={1}
          >
            <List spacing={3} textAlign="start" px={12}>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Everything from DAO
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Token gated (ERC20 and/or ERC721) access to scheduled meetings
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Unlimited sub-teams pages with multiple calendars
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Custom branding
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button w="full" colorScheme="orange" variant="outline" disabled>
                Coming soon
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>
      </Flex>
    </Box>
  )
}
