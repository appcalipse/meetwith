import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import router from 'next/router'
import { useContext } from 'react'
import { IoCheckmarkCircle } from 'react-icons/io5'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { EditMode, Intents, SettingsSection } from '@/types/Dashboard'

const FREE_FEATURES = [
  'Personal scheduling page',
  '1 Meeting type - FREE meetings',
  'Custom availability settings',
  'Custom account handle',
  '5 scheduling groups',
  'Single integration with Google calendar, iCloud, Office 365 or WebDAV',
  'Fixed booking link with wallet address',
  'Limited QuickPolls (max. 2 active polls per time)',
  'Basic calendar sync - 1 calendar sync only',
  'Smart notifications — Email, Discord, and Telegram let you set the cadence for each meeting type.',
  'Unlimited contact connection',
  'Email support',
]

const PRO_FEATURES = [
  'Everything in Free plus (+)',
  'Unlimited scheduling groups',
  'Payments & Invoicing',
  'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
  'Unlimited QuickPolls',
  'Unlimited meeting types - Free & Paid',
  '24/7 priority support',
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
      <Heading fontSize={'4xl'} textAlign="center" mb={12} color="neutral.0">
        Plans That Fit Your Needs
      </Heading>

      <Box display="flex" justifyContent="center" mb={8}>
        <HStack
          spacing={4}
          flexDirection={{ base: 'column', md: 'row' }}
          alignItems="stretch"
        >
          {/* Free Plan */}
          <VStack
            bg={'neutral.900'}
            p={8}
            rounded={10}
            alignItems="flex-start"
            spacing={6}
            borderWidth={1}
            borderColor={'neutral.800'}
            width={{ base: '100%', md: '621px' }}
            h="100%"
          >
            <Heading fontSize="20px" fontWeight="700" color="primary.500">
              Free
            </Heading>
            <VStack alignItems="flex-start" spacing={0}>
              <HStack spacing={0} alignItems="baseline">
                <Text fontSize={'5xl'} fontWeight="bold" color="neutral.0">
                  $0
                </Text>
                <Text fontSize={'lg'} color="neutral.200" ml={2}>
                  / forever
                </Text>
              </HStack>
            </VStack>
            <VStack alignItems="flex-start" spacing={4} w="100%" flex={1}>
              {FREE_FEATURES.map((feature, index) => (
                <HStack key={index} alignItems="center" spacing={3}>
                  <Box color="primary.500" mt={1} flexShrink={0}>
                    <IoCheckmarkCircle size={22} color="#F78C69" />
                  </Box>
                  <Text
                    fontSize="14px"
                    color="neutral.0"
                    lineHeight="1.6"
                    mt={1}
                  >
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
            <Button
              colorScheme="orangeButton"
              textColor={'white'}
              w="100%"
              py={6}
              onClick={() => handleFreePlan()}
              isLoading={loginIn}
            >
              Try for free
            </Button>
          </VStack>

          {/* Pro Plan */}
          <VStack
            bg={'neutral.900'}
            p={8}
            rounded={10}
            alignItems="flex-start"
            spacing={6}
            borderWidth={1}
            borderColor={'neutral.800'}
            width={{ base: '100%', md: '621px' }}
            h="100%"
          >
            <Heading fontSize="20px" fontWeight="700" color="primary.500">
              Pro
            </Heading>
            <VStack alignItems="flex-start" spacing={0}>
              <HStack spacing={0} alignItems="baseline">
                <Text fontSize={'5xl'} fontWeight="bold" color="neutral.0">
                  $8
                </Text>
                <Text fontSize={'lg'} color="neutral.200" ml={2}>
                  / month
                </Text>
              </HStack>
            </VStack>
            <VStack alignItems="flex-start" spacing={4} w="100%" flex={1}>
              {PRO_FEATURES.map((feature, index) => (
                <HStack key={index} alignItems="center" spacing={3}>
                  <Box color="primary.500" mt={1} flexShrink={0}>
                    <IoCheckmarkCircle size={22} color="#F78C69" />
                  </Box>
                  <Text
                    fontSize="14px"
                    color="neutral.0"
                    lineHeight="1.6"
                    mt={1}
                  >
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
                textColor={'white'}
                w="100%"
                py={6}
                onClick={() => handleProPlan()}
                isLoading={loginIn}
              >
                Go Pro
              </Button>
            </VStack>
          </VStack>
        </HStack>
      </Box>

      <VStack spacing={0} mt={8}>
        <Text fontSize="22px" color="neutral.100" textAlign="center">
          Start for free, go Pro. You can try our Pro features using the 14-days
          free trial.
        </Text>
      </VStack>
    </Box>
  )
}
