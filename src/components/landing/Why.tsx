import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SlideFade,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { useContext } from 'react'
import { BsArrowRight, BsBell, BsShieldShaded } from 'react-icons/bs'
import { FaRegCalendarCheck, FaRegHandshake } from 'react-icons/fa'
import { useInView } from 'react-intersection-observer'

import { AccountContext } from '@/providers/AccountProvider'
import { logEvent } from '@/utils/analytics'
import { loginWithWallet } from '@/utils/user_manager'

export function Why() {
  const { currentAccount, login, setLoginIn, loginIn } =
    useContext(AccountContext)

  const toast = useToast()

  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to start on FREE plan')
      try {
        const account = await loginWithWallet(setLoginIn)
        if (!account) {
          return
        }
        await login(account)
        logEvent('Signed in')
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
      toast({
        title: 'Error',
        description: 'You already has an account.',
        status: 'error',
        duration: 7000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  const { ref: whyContainer, inView: isWhyContainerVisible } = useInView({
    triggerOnce: true,
  })

  return (
    <Box
      background="linear-gradient(359.95deg, rgba(31, 41, 51, 0.85) 0.04%, rgba(50, 63, 75, 0.85) 57.61%);"
      px={{ base: 2, md: 10 }}
      py={{ base: '10', md: '20' }}
    >
      <Flex
        ref={whyContainer}
        px={{ base: 2, lg: 40 }}
        gridGap={{ base: '1', lg: '6' }}
        maxW="1360px"
        mx="auto"
        direction={{ base: 'column', lg: 'row' }}
      >
        <Flex direction="column" gridGap={{ base: '1', lg: '6' }}>
          <Text
            color="neutral.100"
            fontSize="4xl"
            fontWeight="bold"
            lineHeight="10"
            mb={{ base: '6', lg: 'unset' }}
          >
            <Text as="span" color="orange.400" fontSize="4xl">
              Why
            </Text>
            <br />
            Meet With Wallet
          </Text>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gridGap={2}
            >
              <Icon as={FaRegHandshake} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="orange.400">
                Meet at your own convenience
              </Heading>
              <Text fontSize="" color="neutral.100">
                Choose how and when you want others to meet you — Meet With
                Wallet lets you manage your time on your terms (including any
                external calendars you want to link).
              </Text>
            </VStack>
          </SlideFade>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gridGap={2}
            >
              <Icon as={BsBell} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="orange.400">
                Stay informed with meeting reminders and follow ups
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet automatically notifies you of upcoming meetings
                over email, push, Discord or Push protocol so that you don’t
                miss a beat. Only if you want it, of course.
              </Text>
            </VStack>
          </SlideFade>
        </Flex>
        <Flex direction="column" gridGap={{ base: '1', lg: '6' }}>
          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gridGap={2}
            >
              <Icon as={BsShieldShaded} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="orange.400">
                Meet at your own convenience
              </Heading>
              <Text fontSize="" color="neutral.100">
                Choose how and when you want others to meet you — Meet With
                Wallet lets you manage your time on your terms (including any
                external calendars you want to link).
              </Text>
            </VStack>
          </SlideFade>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gridGap={2}
            >
              <Icon as={FaRegCalendarCheck} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="orange.400">
                Stay informed with meeting reminders and follow ups
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet automatically notifies you of upcoming meetings
                over email, push, Discord or Push protocol so that you don’t
                miss a beat. Only if you want it, of course.
              </Text>
            </VStack>
          </SlideFade>
          <Box flex={1}>
            <SlideFade
              in={isWhyContainerVisible}
              delay={0.5}
              offsetY={-50}
              unmountOnExit={true}
            >
              <Button
                colorScheme="orange"
                rightIcon={<BsArrowRight />}
                display={{ base: 'none', lg: 'unset' }}
                w="100%"
                h="80px"
                onClick={() => handleLogin()}
                isLoading={loginIn}
              >
                Ready to control your time Web3 style?
              </Button>
            </SlideFade>
          </Box>
        </Flex>
        <Button
          colorScheme="orange"
          rightIcon={<BsArrowRight />}
          display={{ base: 'unset', lg: 'none' }}
          height="72px"
          borderTopRadius="none"
          onClick={() => handleLogin()}
          isLoading={loginIn}
        >
          Ready to control your time Web3 style?
        </Button>
      </Flex>
    </Box>
  )
}
