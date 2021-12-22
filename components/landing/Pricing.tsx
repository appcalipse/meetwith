import { ReactNode, useContext, useState } from 'react'
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
  useToast,
} from '@chakra-ui/react'
import { FaAngry, FaCheckCircle } from 'react-icons/fa'
import { AccountContext } from '../../providers/AccountProvider'
import { loginWithWallet } from '../../utils/user_manager'
import { logEvent } from '../../utils/analytics'
import router from 'next/router'
import AlertMeDialog from './AlertMeDialog'

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
  const { currentAccount, login, setLoginIn, loginIn } =
    useContext(AccountContext)

  const [selectedPlan, setSelectedPlan] = useState(
    undefined as string | undefined
  )

  const toast = useToast()

  const handleLogin = async () => {
    if (!currentAccount) {
      setLoginIn(true)
      logEvent('Clicked to start on FREE plan')
      try {
        const account = await loginWithWallet()
        if (!account) {
          setLoginIn(false)
          return
        }
        await login(account)
        logEvent('Signed in')

        await router.push('/dashboard')
      } catch (error: any) {
        console.error(error)
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 7000,
          position: 'top',
          isClosable: true,
        })
        logEvent('Failed to sign in', error)
      }
    }
    setLoginIn(false)
  }

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
                <ListIcon as={FaCheckCircle} color="green.500" />
                Configurable availability
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Web3 powered meeting room
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
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                isLoading={loginIn}
                onClick={handleLogin}
              >
                Start now
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>

        <PriceWrapper>
          <Box position="relative">
            <Box
              position="absolute"
              top="-16px"
              left="50%"
              style={{ transform: 'translate(-50%)' }}
            >
              <Text
                textTransform="uppercase"
                bg={useColorModeValue('yellow.300', 'yellow.800')}
                px={3}
                py={1}
                color={useColorModeValue('gray.900', 'gray.300')}
                fontSize="sm"
                fontWeight="600"
                rounded="xl"
              >
                Coming soon
              </Text>
            </Box>
          </Box>
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
                ENS and unstoppable domains integration for your calendar link
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
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                onClick={() => setSelectedPlan('Pro')}
              >
                Alert me
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>

        <PriceWrapper>
          <Box position="relative">
            <Box
              position="absolute"
              top="-16px"
              left="50%"
              style={{ transform: 'translate(-50%)' }}
            >
              <Text
                textTransform="uppercase"
                bg={useColorModeValue('yellow.300', 'yellow.800')}
                px={3}
                py={1}
                color={useColorModeValue('gray.900', 'gray.300')}
                fontSize="sm"
                fontWeight="600"
                rounded="xl"
              >
                Coming soon
              </Text>
            </Box>
          </Box>
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
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                onClick={() => setSelectedPlan('DAO')}
              >
                Alert me
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>
        <PriceWrapper>
          <Box position="relative">
            <Box
              position="absolute"
              top="-16px"
              left="50%"
              style={{ transform: 'translate(-50%)' }}
            >
              <Text
                textTransform="uppercase"
                bg={useColorModeValue('yellow.300', 'yellow.800')}
                px={3}
                py={1}
                color={useColorModeValue('gray.900', 'gray.300')}
                fontSize="sm"
                fontWeight="600"
                rounded="xl"
              >
                Coming soon
              </Text>
            </Box>
          </Box>
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
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                onClick={() => setSelectedPlan('Awesome DAO')}
              >
                Alert me
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>
      </Flex>
      <AlertMeDialog
        plan={selectedPlan}
        isOpen={selectedPlan !== undefined}
        onClose={() => setSelectedPlan(undefined)}
      />
    </Box>
  )
}
