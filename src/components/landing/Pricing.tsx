import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { IoCheckmarkCircle } from 'react-icons/io5'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

const FREE_FEATURES = [
  'Personal scheduling page',
  '1 Meeting type - FREE meetings',
  'Custom availability settings',
  'Join unlimited number of groups',
  'Single integration with Google calendar, iCloud, Office 365 or WebDAV',
  'Limited QuickPolls (max. 1 active poll per month)',
  'Basic calendar sync - 1 calendar sync only',
  'Smart notifications - Email, Discord & Telegram',
  'Unlimited contact connection but no schedule allowed',
  'Email support',
]

const PRO_FEATURES = [
  'Everything in Free plus (+):',
  'Unlimited scheduling groups - create, join, schedule groups without limits',
  'Payments & Invoicing',
  'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
  'Unlimited QuickPolls',
  'Unlimited meeting types - Free & Paid',
  '24/7 priority support',
]

const ENTERPRISE_FEATURES = [
  'Dedicated onboarding and engineering support',
  'Uptime guarantees',
  'Team directory integrations',
  'Priority Discord & Telegram account support',
  'Dedicated database',
]

export function Pricing() {
  const { currentAccount, loginIn } = useContext(AccountContext)
  const { openConnection } = useContext(OnboardingModalContext)

  const handleFreePlan = async () => {
    if (!currentAccount) {
      openConnection()
    } else {
      await router.push('/dashboard')
    }
  }

  const handleProPlan = async () => {
    if (!currentAccount) {
      const redirectPath = `/dashboard/settings/subscriptions/billing`
      openConnection(redirectPath)
    } else {
      await router.push(`/dashboard/settings/subscriptions/billing`)
    }
  }

  return (
    <Box
      maxW="1360px"
      mx="auto"
      id="pricing"
      data-testid="pricing"
      scrollMarginTop={{ base: '60px', md: '20px' }}
      px={5}
      py={20}
      pt={0}
    >
      <Heading fontSize="4xl" textAlign="center" mb={12} color="neutral.0">
        Plans that meet your needs
      </Heading>

      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
        gap={8}
        mb={8}
      >
        {/* Free card */}
        <VStack
          bg="neutral.900"
          p={8}
          rounded={10}
          alignItems="flex-start"
          spacing={6}
          borderWidth={1}
          borderColor="neutral.800"
          h="100%"
        >
          <Heading fontSize="20px" fontWeight="700" color="primary.500">
            Free
          </Heading>
          <HStack spacing={0} alignItems="baseline">
            <Text fontSize="5xl" fontWeight="bold" color="neutral.0">
              $0
            </Text>
            <Text fontSize="lg" color="neutral.200" ml={2}>
              / forever
            </Text>
          </HStack>
          <VStack alignItems="flex-start" spacing={4} w="100%" flex={1}>
            {FREE_FEATURES.map((feature, index) => (
              <HStack key={index} alignItems="flex-start" spacing={3}>
                <Box flexShrink={0} mt="2px">
                  <IoCheckmarkCircle size={22} color="#F78C69" />
                </Box>
                <Text fontSize="14px" color="neutral.0" lineHeight="1.6">
                  {feature}
                </Text>
              </HStack>
            ))}
          </VStack>
          <Button
            colorScheme="orangeButton"
            textColor="white"
            w="100%"
            py={6}
            onClick={handleFreePlan}
            isLoading={loginIn}
          >
            Get started
          </Button>
        </VStack>

        {/* Pro card */}
        <VStack
          bg="neutral.900"
          p={8}
          rounded={10}
          alignItems="flex-start"
          spacing={6}
          borderWidth={1}
          borderColor="neutral.800"
          h="100%"
        >
          <Heading fontSize="20px" fontWeight="700" color="primary.500">
            Pro
          </Heading>
          <HStack spacing={0} alignItems="baseline">
            <Text fontSize="5xl" fontWeight="bold" color="neutral.0">
              $8
            </Text>
            <Text fontSize="lg" color="neutral.200" ml={2}>
              / month
            </Text>
          </HStack>
          <VStack alignItems="flex-start" spacing={4} w="100%" flex={1}>
            {PRO_FEATURES.map((feature, index) => (
              <HStack key={index} alignItems="flex-start" spacing={3}>
                <Box flexShrink={0} mt="2px">
                  <IoCheckmarkCircle size={22} color="#F78C69" />
                </Box>
                <Text fontSize="14px" color="neutral.0" lineHeight="1.6">
                  {feature}
                </Text>
              </HStack>
            ))}
          </VStack>
          <VStack w="100%" spacing={3} alignItems="flex-start">
            <Text fontSize="16px" color="neutral.0" w="100%" textAlign="left">
              14 days free trial available
            </Text>
            <Button
              colorScheme="orangeButton"
              textColor="white"
              w="100%"
              py={6}
              onClick={handleProPlan}
              isLoading={loginIn}
            >
              Go Pro
            </Button>
          </VStack>
        </VStack>

        {/* Enterprise card */}
        <VStack
          bg="neutral.900"
          p={8}
          rounded={10}
          alignItems="flex-start"
          spacing={6}
          borderWidth={1}
          borderColor="neutral.800"
          h="100%"
        >
          <Heading fontSize="20px" fontWeight="700" color="primary.500">
            Custom
          </Heading>
          <Text fontSize="sm" color="neutral.300">
            Get a tailored experience for your team.
          </Text>
          <Text fontSize="sm" color="neutral.100" fontStyle="italic">
            PRO plan features, plus:
          </Text>
          <VStack alignItems="flex-start" spacing={4} w="100%" flex={1}>
            {ENTERPRISE_FEATURES.map((feature, index) => (
              <HStack key={index} alignItems="flex-start" spacing={3}>
                <Box flexShrink={0} mt="2px">
                  <IoCheckmarkCircle size={22} color="#F78C69" />
                </Box>
                <Text fontSize="14px" color="neutral.0" lineHeight="1.6">
                  {feature}
                </Text>
              </HStack>
            ))}
          </VStack>
          <Button
            as="a"
            href="https://meetwith.xyz/sinachpat"
            colorScheme="orangeButton"
            textColor="white"
            w="100%"
            py={6}
          >
            Talk to sales
          </Button>
        </VStack>
      </Grid>

      <Text
        fontSize="xl"
        color="neutral.100"
        textAlign="center"
        maxW="862px"
        mx="auto"
      >
        Start for free, go Pro. You can try our Pro features using the 14-days
        free trial.
      </Text>
    </Box>
  )
}
