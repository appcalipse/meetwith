import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  List,
  ListIcon,
  ListItem,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import router from 'next/router'
import { ReactNode, useContext, useState } from 'react'
import { FaAngry, FaCheckCircle } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { Plan } from '@/types/Subscription'
import { logEvent } from '@/utils/analytics'
import { loginWithWallet } from '@/utils/user_manager'

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

  const handleLogin = async (selectedPlan?: Plan) => {
    if (!currentAccount) {
      logEvent('Clicked to start on FREE plan')
      try {
        const account = await loginWithWallet(setLoginIn)
        if (!account) {
          return
        }
        await login(account)
        logEvent('Signed in')

        if (selectedPlan && selectedPlan === Plan.PRO) {
          await router.push('/dashboard/details')
        } else {
          await router.push('/dashboard')
        }
      } catch (error: any) {
        Sentry.captureException(error)
        toast({
          title: 'Error',
          description: error.message || error,
          status: 'error',
          duration: 7000,
          position: 'top',
          isClosable: true,
        })
        logEvent('Failed to sign in', error)
      }
    } else {
      if (selectedPlan && selectedPlan === Plan.PRO) {
        await router.push('/dashboard/details')
      } else {
        await router.push('/dashboard')
      }
    }
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
                $
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                0
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /forever
              </Text>
            </HStack>
            <Box pb={6} />
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
                <ListIcon as={FaCheckCircle} color="green.500" />
                Email notifications (optional)
              </ListItem>
              <ListItem>
                <ListIcon as={FaAngry} color="red.500" />
                Single meeting configuration
              </ListItem>
              <ListItem>
                <ListIcon as={FaAngry} color="red.500" />
                Single integration with Google calendar, iCloud, Office 365 or
                WebDAV
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
                onClick={() => handleLogin()}
              >
                Start now
              </Button>
            </Box>
          </VStack>
        </PriceWrapper>

        <PriceWrapper>
          <Box py={4} px={12}>
            <Text fontWeight="500" fontSize="2xl" textAlign="center">
              Pro
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                $
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                30
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
            <Text fontSize="xs" textAlign="center">
              Paid in ETH, MATIC, METIS, ONE, USDC or DAI
            </Text>
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
                Email, Push and Discord Notifications (optional)
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Unlimited integrations (Google calendar, iCloud, Office 365 and
                WebDAV)
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                onClick={() => handleLogin(Plan.PRO)}
              >
                Go PRO
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
              Guild/Group
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                $
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                200
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
            <Text fontSize="xs" textAlign="center">
              Paid in ETH, MATIC, METIS, ONE, USDC or DAI
            </Text>
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
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                Custom branding
              </ListItem>
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                And more to come
              </ListItem>
            </List>
            <Box w="80%" pt={7} display="flex" alignItems="flex-end" flex={1}>
              <Button
                w="full"
                colorScheme="orange"
                variant="outline"
                onClick={() => setSelectedPlan('Guild')}
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
              DAO/Commmunity
            </Text>
            <HStack justifyContent="center">
              <Text fontSize="3xl" fontWeight="600" fontFamily="sans-serif">
                $
              </Text>
              <Text fontSize="5xl" fontWeight="900">
                999
              </Text>
              <Text fontSize="3xl" color="gray.500">
                /year
              </Text>
            </HStack>
            <Text fontSize="xs" textAlign="center">
              Paid in ETH, MATIC, METIS, ONE, USDC or DAI
            </Text>
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
                Everything from Guild
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
              <ListItem>
                <ListIcon as={FaCheckCircle} color="green.500" />
                And more to come
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
      </Flex>
      <AlertMeDialog
        plan={selectedPlan}
        isOpen={selectedPlan !== undefined}
        onClose={() => setSelectedPlan(undefined)}
      />
    </Box>
  )
}
