import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SlideFade,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { BsBell, BsShieldShaded } from 'react-icons/bs'
import { FaRegCalendarCheck, FaRegHandshake } from 'react-icons/fa'
import { useInView } from 'react-intersection-observer'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { logEvent } from '@/utils/analytics'

export function Why() {
  const { currentAccount, loginIn } = useContext(AccountContext)

  const { openConnection } = useContext(OnboardingModalContext)

  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to start on WHY section')
      openConnection()
    } else {
      await router.push('/dashboard')
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
        <Flex direction="column" justify="end" gridGap={{ base: '1', lg: '6' }}>
          <Text
            color="neutral.100"
            fontSize="4xl"
            fontWeight="bold"
            lineHeight="10"
            mb={{ base: '6', lg: 'unset' }}
          >
            <Text as="span" color="primary.400" fontSize="4xl">
              Why
            </Text>
            <br />
            Meet With Wallet
          </Text>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.25}
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

              <Heading fontSize="xl" color="primary.400">
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

              <Heading fontSize="xl" color="primary.400">
                Stay informed with meeting reminders and follow ups
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet automatically notifies you of upcoming meetings
                over email, push notifications, or Discord so that you don’t
                miss a beat. Only if you want it, of course.
              </Text>
            </VStack>
          </SlideFade>
        </Flex>
        <Flex direction="column" gridGap={{ base: '1', lg: '6' }}>
          <SlideFade
            in={isWhyContainerVisible}
            delay={0.75}
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

              <Heading fontSize="xl" color="primary.400">
                Secure meetings with data protection and privacy
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet does not store your meetings data. Information
                is encrypted and only your wallet can decrypt it. Only meeting
                participants have access to meeting private information.
              </Text>
            </VStack>
          </SlideFade>

          <SlideFade
            in={isWhyContainerVisible}
            delay={1}
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

              <Heading fontSize="xl" color="primary.400">
                Find mutual timeslots easily
              </Heading>
              <Text fontSize="" color="neutral.100">
                Find open timeslots in everyone’s calendar in just a few clicks,
                reduce back-and-forth scheduling by finding the right time to
                meet.
              </Text>
            </VStack>
          </SlideFade>
          <Box flex={1}>
            <SlideFade
              in={isWhyContainerVisible}
              delay={1.25}
              offsetY={-50}
              unmountOnExit={true}
            >
              <Button
                colorScheme="primary"
                display={{ base: 'none', lg: 'flex' }}
                justifyContent="space-between"
                fontSize="xl"
                w="100%"
                h="80px"
                onClick={() => handleLogin()}
                isLoading={loginIn}
              >
                <Text fontSize="lg" textAlign="left">
                  Ready to control your time <br /> Web3 style?
                </Text>
                <ArrowForwardIcon boxSize={6} mr={8} />
              </Button>
            </SlideFade>
          </Box>
        </Flex>
        <Button
          colorScheme="primary"
          display={{ base: 'flex', lg: 'none' }}
          justifyContent="space-between"
          height="80px"
          borderTopRadius="none"
          onClick={() => handleLogin()}
          isLoading={loginIn}
        >
          <Text fontSize="lg" textAlign="left">
            Ready to control your time <br /> Web3 style?
          </Text>
          <ArrowForwardIcon boxSize={6} mr={4} />
        </Button>
      </Flex>
    </Box>
  )
}
