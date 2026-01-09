import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  HStack,
  Stack,
  Switch,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import SubscriptionCheckoutModal from '@components/billing/SubscriptionCheckoutModal'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useRef, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import useAccountContext from '@/hooks/useAccountContext'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import {
  BillingCycle,
  PaymentProvider,
  SubscribeRequest,
  SubscribeRequestCrypto,
  SubscribeResponseCrypto,
  SubscriptionType,
  TrialEligibilityResponse,
} from '@/types/Billing'
import {
  AcceptedToken,
  getSupportedChainFromId,
  supportedChains,
} from '@/types/chains'
import {
  getActiveSubscription,
  getBillingPlans,
  getTrialEligibility,
  subscribeToBillingPlan,
  subscribeToBillingPlanCrypto,
} from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

const BillingCheckout = () => {
  const router = useRouter()
  const currentAccount = useAccountContext()
  const [isYearly, setIsYearly] = useState(false)
  const {
    isOpen: isCryptoModalOpen,
    onOpen: onCryptoModalOpen,
    onClose: onCryptoModalClose,
  } = useDisclosure()
  const {
    isOpen: isTrialDialogOpen,
    onOpen: onTrialDialogOpen,
    onClose: onTrialDialogClose,
  } = useDisclosure()
  const trialCancelRef = useRef<HTMLButtonElement | null>(null)

  const monthlyPrice = 8
  const yearlyPrice = 80
  const subtotal = isYearly ? yearlyPrice : monthlyPrice

  const planName = 'Meetwith PRO'
  const heading = 'Subscribe to Meetwith Premium'

  // Get default chain and token from user preferences or use defaults
  const defaultChainId =
    currentAccount?.payment_preferences?.default_chain_id ||
    supportedChains.find(chain => chain.walletSupported)?.id
  const defaultChain = defaultChainId
    ? getSupportedChainFromId(defaultChainId)
    : supportedChains.find(chain => chain.walletSupported)
  const defaultToken = AcceptedToken.USDC

  // Trial eligibility
  const { data: trialEligibility } = useQuery<TrialEligibilityResponse>({
    queryKey: ['trialEligibility'],
    queryFn: getTrialEligibility,
    staleTime: 60000,
    refetchOnMount: true,
    onError: (err: unknown) => {
      handleApiError('Failed to check trial eligibility', err)
    },
  })

  const isTrialEligible = trialEligibility?.eligible === true

  const { data: currentSubscription } = useQuery({
    queryKey: ['currentSubscription', currentAccount?.address],
    queryFn: () => getActiveSubscription(currentAccount!.address),
    enabled: !!currentAccount?.address,
    staleTime: 30000,
  })

  const hasActiveSubscription = Boolean(
    currentSubscription?.is_active === true &&
      currentSubscription?.expires_at &&
      new Date(currentSubscription.expires_at) > new Date()
  )

  const isActiveStripeSubscription =
    hasActiveSubscription &&
    currentSubscription?.payment_provider === PaymentProvider.STRIPE

  // Fetch billing plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['billingPlans'],
    queryFn: getBillingPlans,
    staleTime: 300000,
    refetchOnMount: true,
    onError: (err: unknown) => {
      handleApiError('Failed to load billing plans', err)
    },
  })

  // Stripe subscription mutation
  const subscribeMutation = useMutation({
    mutationFn: (request: SubscribeRequest) => subscribeToBillingPlan(request),
    onSuccess: response => {
      if (response.checkout_url) {
        window.open(response.checkout_url, '_blank', 'noopener,noreferrer')
      } else {
        handleApiError(
          'Failed to create checkout session',
          new Error('No checkout URL received')
        )
      }
    },
    onError: (err: unknown) => {
      handleApiError('Failed to create checkout session', err)
    },
  })

  // Crypto subscription mutation
  const [cryptoPaymentConfig, setCryptoPaymentConfig] =
    useState<SubscribeResponseCrypto | null>(null)

  const cryptoSubscribeMutation = useMutation({
    mutationFn: (request: SubscribeRequestCrypto) =>
      subscribeToBillingPlanCrypto(request),
    onSuccess: (response, variables) => {
      // Trials: no payment modal; redirect to refresh subscription card
      if (variables?.is_trial || response.amount <= 0) {
        router.push('/dashboard/settings/subscriptions?checkout=success')
        return
      }
      setCryptoPaymentConfig(response)
      onCryptoModalOpen()
    },
    onError: (err: unknown) => {
      handleApiError('Failed to create crypto subscription config', err)
    },
  })

  const handlePayWithCard = async () => {
    // Find the billing plan ID based on isYearly
    const selectedPlan = plans.find(
      plan =>
        plan.billing_cycle ===
        (isYearly ? BillingCycle.YEARLY : BillingCycle.MONTHLY)
    )

    if (!selectedPlan) {
      handleApiError(
        'Failed to create checkout session',
        new Error('Billing plan not found')
      )
      return
    }

    // Trigger the mutation
    const request: SubscribeRequest = {
      billing_plan_id: selectedPlan.billing_cycle,
      payment_method: 'stripe',
    }

    try {
      await subscribeMutation.mutateAsync(request)
    } catch (error) {
      throw error
    }
  }

  const handlePayWithCrypto = async () => {
    // Find the billing plan ID based on isYearly
    const selectedPlan = plans.find(
      plan =>
        plan.billing_cycle ===
        (isYearly ? BillingCycle.YEARLY : BillingCycle.MONTHLY)
    )

    if (!selectedPlan) {
      handleApiError(
        'Failed to create crypto subscription config',
        new Error('Billing plan not found')
      )
      return
    }

    // Trigger the mutation (always INITIAL for crypto - no extension flow)
    const request: SubscribeRequestCrypto = {
      billing_plan_id: selectedPlan.billing_cycle,
      subscription_type: SubscriptionType.INITIAL,
    }

    try {
      await cryptoSubscribeMutation.mutateAsync(request)
    } catch (error) {
      throw error
    }
  }

  const handleStartCryptoTrial = async () => {
    const selectedPlan = plans.find(
      plan =>
        plan.billing_cycle ===
        (isYearly ? BillingCycle.YEARLY : BillingCycle.MONTHLY)
    )

    if (!selectedPlan) {
      handleApiError(
        'Failed to start trial',
        new Error('Billing plan not found')
      )
      return
    }

    const request: SubscribeRequestCrypto = {
      billing_plan_id: selectedPlan.billing_cycle,
      subscription_type: SubscriptionType.INITIAL,
      is_trial: true,
    }

    try {
      await cryptoSubscribeMutation.mutateAsync(request)
    } catch (error) {
      throw error
    }
  }

  const handleConfirmCryptoTrial = async () => {
    await handleStartCryptoTrial()
    onTrialDialogClose()
  }

  const handleCryptoPaymentSuccess = () => {
    // Redirect to subscriptions page with success message
    router.push('/dashboard/settings/subscriptions?checkout=success')
  }

  const handleCryptoPaymentClick = async () => {
    if (isTrialEligible) {
      onTrialDialogOpen()
    } else {
      await handlePayWithCrypto()
    }
  }

  return (
    <Container maxW="622px" px={{ base: 4, md: 6 }} py={{ base: 10, md: 14 }}>
      <VStack align="flex-start" spacing={8} width="100%">
        <Button
          variant="ghost"
          color="primary.300"
          leftIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          px={0}
          _hover={{ bg: 'transparent', color: 'primary.300' }}
        >
          Back
        </Button>
        <VStack align="flex-start" spacing={1}>
          <Text fontSize="20px" color="text-primary" fontWeight="700">
            {heading}
          </Text>
          <HStack spacing={2} align="baseline">
            <Text fontSize="4xl" fontWeight="bold" color="text-primary">
              ${subtotal}
            </Text>
            <Text fontSize="md" color="text-primary">
              /{isYearly ? 'year' : 'month'}
            </Text>
          </HStack>
          <HStack spacing={3}>
            <Box
              w="60px"
              h="60px"
              bg="bg-surface-tertiary"
              borderRadius="5px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Image
                src="/assets/logo.svg"
                alt="Meetwith logo"
                width={32}
                height={20}
              />
            </Box>
            <VStack spacing={0} align="flex-start">
              <Text fontSize="20px" fontWeight="700" color="text-primary">
                {planName}
              </Text>
              <Text fontSize="16px" color="text-secondary">
                Billed {isYearly ? 'Yearly' : 'Monthly'}
              </Text>
            </VStack>
          </HStack>
        </VStack>

        <VStack align="flex-start" spacing={4} width="100%">
          <Text fontSize="20px" fontWeight="700" color="text-primary">
            Payment summary
          </Text>
          <Stack
            direction={{ base: 'column', md: 'row' }}
            width="100%"
            spacing={8}
            color="text-primary"
            fontSize="sm"
          >
            <VStack align="flex-start" spacing={3} flex={1}>
              <HStack justify="space-between" width="100%">
                <Text fontSize="16px" color="text-primary">
                  Subtotal
                </Text>
                <HStack spacing={2}>
                  <Text fontSize="16px" color="text-primary">
                    ${monthlyPrice} for a month
                  </Text>
                  <Text fontSize="16px" color="text-primary">
                    or
                  </Text>
                  <Text fontSize="16px" color="text-primary">
                    ${yearlyPrice} for a year
                  </Text>
                </HStack>
              </HStack>
              <HStack justify="space-between" width="100%">
                <Text fontSize="16px" color="text-primary">
                  Total due
                </Text>
                <Text fontSize="16px" fontWeight="700" color="text-primary">
                  ${subtotal}
                </Text>
              </HStack>
              <HStack pt={2} spacing={3}>
                <Switch
                  colorScheme="primary"
                  isChecked={isYearly}
                  onChange={e => setIsYearly(e.target.checked)}
                  size="md"
                />
                <Text fontSize="16px" color="text-primary" fontWeight="500">
                  Pay yearly
                </Text>
                <Text fontSize="16px" color="text-primary">
                  (pay ${yearlyPrice} for a year)
                </Text>
              </HStack>
            </VStack>
          </Stack>
        </VStack>

        <Divider borderColor="neutral.700" />

        <VStack align="flex-start" spacing={4} width="100%">
          <Text fontWeight="700" color="text-primary" fontSize="24px">
            Make your payment
          </Text>
          <Text fontSize="16px" color="text-primary" fontWeight="700">
            Select payment method
          </Text>

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={4}
            width="100%"
          >
            <PaymentMethod
              id="fiat"
              name={
                isTrialEligible
                  ? 'Start 14-day free trial (card)'
                  : 'Pay with Card'
              }
              tag="Your fiat cards"
              step={PaymentStep.SELECT_PAYMENT_METHOD}
              icon={FiatLogo}
              type={PaymentType.FIAT}
              disabled={
                isLoadingPlans ||
                subscribeMutation.isLoading ||
                isActiveStripeSubscription
              }
              onClick={handlePayWithCard}
            />
            <PaymentMethod
              id="crypto"
              name={
                isTrialEligible
                  ? 'Start 14-day free trial (crypto)'
                  : 'Pay with crypto'
              }
              step={PaymentStep.SELECT_CRYPTO_NETWORK}
              icon={ChainLogo}
              type={PaymentType.CRYPTO}
              disabled={
                isLoadingPlans ||
                cryptoSubscribeMutation.isLoading ||
                !defaultChain
              }
              onClick={handleCryptoPaymentClick}
            />
          </Stack>
        </VStack>
      </VStack>

      {/* Crypto Subscription Checkout Modal */}
      {cryptoPaymentConfig && defaultChain && (
        <SubscriptionCheckoutModal
          isOpen={isCryptoModalOpen}
          onClose={onCryptoModalClose}
          subscriptionData={cryptoPaymentConfig.subscriptionData}
          amount={cryptoPaymentConfig.amount}
          chain={defaultChain}
          token={defaultToken}
          onSuccess={handleCryptoPaymentSuccess}
        />
      )}

      {/* Crypto Trial Confirmation Dialog */}
      <AlertDialog
        isOpen={isTrialDialogOpen}
        onClose={onTrialDialogClose}
        isCentered
        leastDestructiveRef={trialCancelRef}
      >
        <AlertDialogOverlay bg="blackAlpha.900" />
        <AlertDialogContent
          bg="bg-surface"
          borderColor="border-default"
          borderWidth="1px"
        >
          <AlertDialogHeader
            fontSize="lg"
            fontWeight="bold"
            color="text-primary"
            pb={2}
          >
            Start 14-day crypto trial
          </AlertDialogHeader>
          <AlertDialogBody>
            <VStack align="flex-start" spacing={3}>
              <Text color="text-primary" fontSize="md">
                You’ll get full Pro access for 14 days without payment. You can
                extend to a paid plan at any time, or cancel the trial — access
                continues until it expires.
              </Text>
            </VStack>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={trialCancelRef}
              onClick={onTrialDialogClose}
              isDisabled={cryptoSubscribeMutation.isLoading}
              variant="ghost"
            >
              Not now
            </Button>
            <Button
              colorScheme="primary"
              ml={3}
              onClick={handleConfirmCryptoTrial}
              isLoading={cryptoSubscribeMutation.isLoading}
              loadingText="Starting trial..."
              isDisabled={cryptoSubscribeMutation.isLoading}
            >
              Start trial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(BillingCheckout))
