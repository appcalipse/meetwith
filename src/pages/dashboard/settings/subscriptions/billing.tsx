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
import CustomHandleSelectionModal from '@components/billing/CustomHandleSelectionModal'
import SubscriptionCheckoutModal from '@components/billing/SubscriptionCheckoutModal'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import Image from 'next/image'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { FaArrowLeft, FaArrowRight, FaEdit } from 'react-icons/fa'

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
import { SettingsSection } from '@/types/Dashboard'
import {
  getBillingPlans,
  getTrialEligibility,
  subscribeToBillingPlan,
  subscribeToBillingPlanCrypto,
} from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import { getSubscriptionHandle, saveSubscriptionHandle } from '@/utils/storage'
import {
  getActiveBillingSubscription,
  getActiveProSubscription,
} from '@/utils/subscription_manager'

const BillingCheckout = () => {
  const router = useRouter()
  const [handleFromStorage, setHandleFromStorage] = useState(
    getSubscriptionHandle() || undefined
  )

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
  const {
    isOpen: isHandleModalOpen,
    onOpen: onHandleModalOpen,
    onClose: onHandleModalClose,
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
    onError: (err: unknown) => {
      handleApiError('Failed to check trial eligibility', err)
    },
    queryFn: getTrialEligibility,
    queryKey: ['trialEligibility'],
    refetchOnMount: true,
    staleTime: 60000,
  })

  const isTrialEligible = trialEligibility?.eligible === true

  const activeSubscription = getActiveProSubscription(currentAccount)
  const activeBillingSubscription = getActiveBillingSubscription(currentAccount)

  const _hasActiveSubscription = Boolean(
    activeSubscription || activeBillingSubscription
  )

  const _isActiveStripeSubscription = Boolean(
    activeBillingSubscription?.billing_plan_id &&
      !activeBillingSubscription?.transaction_id
  )

  const handle =
    handleFromStorage ||
    activeSubscription?.domain ||
    activeBillingSubscription?.domain ||
    undefined

  // Fetch billing plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    onError: (err: unknown) => {
      handleApiError('Failed to load billing plans', err)
    },
    queryFn: getBillingPlans,
    queryKey: ['billingPlans'],
    refetchOnMount: true,
    staleTime: 300000,
  })

  // Stripe subscription mutation
  const subscribeMutation = useMutation({
    mutationFn: (request: SubscribeRequest) => subscribeToBillingPlan(request),
    onError: (err: unknown) => {
      handleApiError('Failed to create checkout session', err)
    },
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
  })

  // Crypto subscription mutation
  const [cryptoPaymentConfig, setCryptoPaymentConfig] =
    useState<SubscribeResponseCrypto | null>(null)

  const cryptoSubscribeMutation = useMutation({
    mutationFn: (request: SubscribeRequestCrypto) =>
      subscribeToBillingPlanCrypto(request),
    onError: (err: unknown) => {
      handleApiError('Failed to create crypto subscription config', err)
    },
    onSuccess: (response, variables) => {
      // Trials: no payment modal; redirect to refresh subscription card
      if (variables?.is_trial || response.amount <= 0) {
        router.push('/dashboard/settings/subscriptions?checkout=success')
        return
      }
      setCryptoPaymentConfig(response)
      onCryptoModalOpen()
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
      handle,
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
      handle,
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
      is_trial: true,
      subscription_type: SubscriptionType.INITIAL,
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

  const handleChangeHandle = () => {
    onHandleModalOpen()
  }

  const handleChooseHandle = () => {
    onHandleModalOpen()
  }

  const handleHandleSelected = (newHandle: string) => {
    saveSubscriptionHandle(newHandle)
    setHandleFromStorage(newHandle)
    onHandleModalClose()
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
          _hover={{ bg: 'transparent', color: 'primary.300' }}
          color="primary.300"
          leftIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          px={0}
          variant="ghost"
        >
          Back
        </Button>
        <VStack align="flex-start" spacing={1}>
          <Text color="text-primary" fontSize="20px" fontWeight="700">
            {heading}
          </Text>
          <HStack align="baseline" spacing={2}>
            <Text color="text-primary" fontSize="4xl" fontWeight="bold">
              ${subtotal}
            </Text>
            <Text color="text-primary" fontSize="md">
              /{isYearly ? 'year' : 'month'}
            </Text>
          </HStack>
          <HStack spacing={3}>
            <Box
              alignItems="center"
              bg="bg-surface-tertiary"
              borderRadius="5px"
              display="flex"
              h="60px"
              justifyContent="center"
              w="60px"
            >
              <Image
                alt="Meetwith logo"
                height={20}
                src="/assets/logo.svg"
                width={32}
              />
            </Box>
            <VStack align="flex-start" spacing={0}>
              <Text color="text-primary" fontSize="20px" fontWeight="700">
                {planName}
              </Text>
              <Text color="text-secondary" fontSize="16px">
                Billed {isYearly ? 'Yearly' : 'Monthly'}
              </Text>
            </VStack>
          </HStack>
        </VStack>

        <VStack align="flex-start" spacing={4} width="100%">
          <Text color="text-primary" fontSize="20px" fontWeight="700">
            Payment summary
          </Text>
          <Stack
            color="text-primary"
            direction={{ base: 'column', md: 'row' }}
            fontSize="sm"
            spacing={8}
            width="100%"
          >
            <VStack align="flex-start" flex={1} spacing={3}>
              <HStack justify="space-between" width="100%">
                <Text color="text-primary" fontSize="16px">
                  Subtotal
                </Text>
                <HStack spacing={2}>
                  <Text color="text-primary" fontSize="16px">
                    ${monthlyPrice} for a month
                  </Text>
                  <Text color="text-primary" fontSize="16px">
                    or
                  </Text>
                  <Text color="text-primary" fontSize="16px">
                    ${yearlyPrice} for a year
                  </Text>
                </HStack>
              </HStack>
              <HStack justify="space-between" width="100%">
                <Text color="text-primary" fontSize="16px">
                  Total due
                </Text>
                <Text color="text-primary" fontSize="16px" fontWeight="700">
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
                <Text color="text-primary" fontSize="16px" fontWeight="500">
                  Pay yearly
                </Text>
                <Text color="text-primary" fontSize="16px">
                  (pay ${yearlyPrice} for a year)
                </Text>
              </HStack>
            </VStack>
          </Stack>
        </VStack>

        <Divider borderColor="neutral.700" />

        {/* Handle Display Section */}
        <VStack align="flex-start" spacing={0} width="100%">
          <Text fontSize="16px" fontWeight="700" color="text-primary">
            Your booking link
          </Text>
          {handle ? (
            <HStack
              width="100%"
              justify="space-between"
              bg="bg-surface-secondary"
              p={4}
              px={0}
              borderRadius="md"
            >
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="sm" color="text-secondary">
                  Your calendar will be available at:
                </Text>
                <Text fontSize="md" fontWeight="600" color="primary.300">
                  {appUrl}/{handle}
                </Text>
              </VStack>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FaEdit />}
                color="text-secondary"
                onClick={handleChangeHandle}
                _hover={{ color: 'text-primary' }}
              >
                Change
              </Button>
            </HStack>
          ) : (
            <Box
              mt={2}
              width="100%"
              bg="bg-surface-secondary"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border-default"
              borderStyle="dashed"
            >
              <HStack justify="space-between" align="center" width="100%">
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text fontSize="sm" color="text-secondary">
                    Choose a custom handle for your calendar link
                  </Text>
                  <Button
                    as="a"
                    variant="link"
                    colorScheme="primary"
                    size="sm"
                    onClick={e => {
                      e.preventDefault()
                      handleChooseHandle()
                    }}
                    px={0}
                    fontSize="md"
                    fontWeight="600"
                    _hover={{ textDecoration: 'underline' }}
                    cursor="pointer"
                  >
                    Choose a handle
                  </Button>
                </VStack>
              </HStack>
            </Box>
          )}
        </VStack>

        <Divider borderColor="neutral.700" />

        <VStack align="flex-start" spacing={4} width="100%">
          <Text color="text-primary" fontSize="24px" fontWeight="700">
            Make your payment
          </Text>
          <Text color="text-primary" fontSize="16px" fontWeight="700">
            Select payment method
          </Text>

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={4}
            width="100%"
          >
            <PaymentMethod
              disabled={
                isLoadingPlans || subscribeMutation.isLoading || !handle
              }
              icon={FiatLogo}
              id="fiat"
              name={
                isTrialEligible
                  ? 'Start 14-day free trial (card)'
                  : 'Pay with Card'
              }
              onClick={handlePayWithCard}
              step={PaymentStep.SELECT_PAYMENT_METHOD}
              tag="Your fiat cards"
              type={PaymentType.FIAT}
            />
            <PaymentMethod
              disabled={
                isLoadingPlans ||
                cryptoSubscribeMutation.isLoading ||
                !defaultChain ||
                !handle
              }
              icon={ChainLogo}
              id="crypto"
              name={
                isTrialEligible
                  ? 'Start 14-day free trial (crypto)'
                  : 'Pay with crypto'
              }
              onClick={handleCryptoPaymentClick}
              step={PaymentStep.SELECT_CRYPTO_NETWORK}
              type={PaymentType.CRYPTO}
            />
          </Stack>
        </VStack>
      </VStack>

      {/* Crypto Subscription Checkout Modal */}
      {cryptoPaymentConfig && defaultChain && (
        <SubscriptionCheckoutModal
          amount={cryptoPaymentConfig.amount}
          chain={defaultChain}
          isOpen={isCryptoModalOpen}
          onClose={onCryptoModalClose}
          onSuccess={handleCryptoPaymentSuccess}
          subscriptionData={cryptoPaymentConfig.subscriptionData}
          token={defaultToken}
        />
      )}

      {/* Crypto Trial Confirmation Dialog */}
      <AlertDialog
        isCentered
        isOpen={isTrialDialogOpen}
        leastDestructiveRef={trialCancelRef}
        onClose={onTrialDialogClose}
      >
        <AlertDialogOverlay bg="blackAlpha.900" />
        <AlertDialogContent
          bg="bg-surface"
          borderColor="border-default"
          borderWidth="1px"
        >
          <AlertDialogHeader
            color="text-primary"
            fontSize="lg"
            fontWeight="bold"
            pb={2}
          >
            Start 14-day crypto trial
          </AlertDialogHeader>
          <AlertDialogBody>
            <VStack align="flex-start" spacing={3}>
              <Text color="text-primary" fontSize="md">
                You'll get full Pro access for 14 days without payment. You can
                extend to a paid plan at any time, or cancel the trial — access
                continues until it expires.
              </Text>
            </VStack>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              isDisabled={cryptoSubscribeMutation.isLoading}
              onClick={onTrialDialogClose}
              ref={trialCancelRef}
              variant="ghost"
            >
              Not now
            </Button>
            <Button
              colorScheme="primary"
              isDisabled={cryptoSubscribeMutation.isLoading}
              isLoading={cryptoSubscribeMutation.isLoading}
              loadingText="Starting trial..."
              ml={3}
              onClick={handleConfirmCryptoTrial}
            >
              Start trial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Handle Selection Modal */}
      {currentAccount?.address && (
        <CustomHandleSelectionModal
          currentAccountAddress={currentAccount.address}
          isOpen={isHandleModalOpen}
          onClose={onHandleModalClose}
          onHandleSelected={handleHandleSelected}
        />
      )}
    </Container>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(BillingCheckout))
