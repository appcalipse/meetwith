import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  ListItem,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  UnorderedList,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { useContext } from 'react'
import { FaTag } from 'react-icons/fa'

import CustomLoading from '@/components/CustomLoading'
import Pagination from '@/components/profile/Pagination'
import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import {
  BillingMode,
  PaymentProvider,
  SubscriptionHistoryItem,
} from '@/types/Billing'
import { EditMode, Intents, SettingsSection } from '@/types/Dashboard'
import {
  FREE_PLAN_BENEFITS,
  getPlanInfo,
  Plan,
  PlanInfo,
  PRO_PLAN_BENEFITS,
  Subscription,
} from '@/types/Subscription'
import {
  cancelCryptoSubscription,
  getActiveSubscription,
  getManageSubscriptionUrl,
  getSubscriptionHistory,
  syncSubscriptions,
} from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { getActiveBillingSubscription } from '@/utils/subscription_manager'
import { useToastHelpers } from '@/utils/toasts'

import Block from './components/Block'
import CancelSubscriptionModal from './components/CancelSubscriptionModal'
import CouponUsedModal from './components/CouponUsedModal'

const AccountPlansAndBilling: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  // Constants
  const DEFAULT_COUPON_DURATION_MONTHS = 3

  const { showSuccessToast, showInfoToast } = useToastHelpers()
  const { query, push, replace } = useRouter()
  const { intent, coupon, checkout, portal_success } = query
  const { updateUser } = useContext(AccountContext)

  const subsRef = useRef<any>(null)
  const processedCheckoutRef = useRef<string | undefined>(undefined)
  const [manageSubscriptionLoading, setManageSubscriptionLoading] =
    useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isCancelModalOpen,
    onOpen: onCancelModalOpen,
    onClose: onCancelModalClose,
  } = useDisclosure()
  const [couponCode, setCouponCode] = useState('')
  const [couponDuration, setCouponDuration] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const HISTORY_PER_PAGE = 10

  // Extract active billing subscription from logged-in account data
  const billingSubscription = React.useMemo(() => {
    return getActiveBillingSubscription(currentAccount)
  }, [currentAccount?.subscriptions])

  // Get blockchain subscription if no billing subscription exists
  const blockchainSubscription = React.useMemo(() => {
    if (billingSubscription) return undefined
    return currentAccount?.subscriptions?.find(
      sub => new Date(sub.expiry_time) > new Date()
    )
  }, [billingSubscription, currentAccount?.subscriptions])

  // Fetch billing plan details only if we have a billing subscription
  const {
    data: billingSubscriptionDetails,
    isFetching: billingFetching,
    error: billingError,
    refetch: refetchBillingDetails,
  } = useQuery({
    queryKey: [
      'billingSubscriptionDetails',
      currentAccount?.address,
      billingSubscription?.billing_plan_id,
    ],
    queryFn: async () => {
      return await getActiveSubscription(currentAccount!.address)
    },
    enabled:
      !!currentAccount?.address && !!billingSubscription?.billing_plan_id,
    staleTime: 30000, // 30 seconds
    onError: (err: unknown) => {
      handleApiError('Failed to load subscription details', err)
    },
  })

  // Extract billing plan and payment provider from details
  const billingPlan = billingSubscriptionDetails?.billing_plan ?? null
  const paymentProvider = billingSubscriptionDetails?.payment_provider ?? null

  // Derive billing plan label, status, and expiry from subscription data
  const billingPlanLabel = billingPlan
    ? billingPlan.billing_cycle === 'yearly'
      ? 'Pro – $80/year'
      : 'Pro – $8/month'
    : 'Meetwith PRO'

  const billingStatus = billingSubscription?.status ?? null

  const isCryptoTrial =
    paymentProvider !== PaymentProvider.STRIPE &&
    billingSubscription?.billing_plan_id &&
    !billingSubscription?.transaction_id

  const billingExpiry = billingSubscription?.expiry_time
    ? format(new Date(billingSubscription.expiry_time), 'PPP')
    : null

  // Check if there's an error
  const hasBillingError = billingError != null

  const handleIntents = () => {
    if (intent === Intents.USE_COUPON) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (coupon) {
        setCouponCode(coupon.toString())
        setCouponDuration(DEFAULT_COUPON_DURATION_MONTHS)
        void push(`/dashboard/settings/${SettingsSection.DETAILS}`)
        onOpen()
      }
    } else if (intent === Intents.SUBSCRIBE_PRO) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      void push(
        `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}/billing`,
        undefined,
        {
          shallow: true,
        }
      )
    }
  }

  useEffect(() => {
    handleIntents()
  }, [intent])

  useEffect(() => {
    syncCurrentSubscriptions()
  }, [currentAccount])

  // Handle Stripe Checkout redirects
  useEffect(() => {
    const checkoutValue = checkout as string | undefined

    // Only process if checkout has a value and we haven't processed this value yet
    if (checkoutValue && processedCheckoutRef.current !== checkoutValue) {
      processedCheckoutRef.current = checkoutValue

      if (checkoutValue === 'success') {
        showSuccessToast('Subscription successful!', 'Welcome to Pro!')
        void updateUser()
        // Clean up query parameters
        const {
          checkout: _checkout,
          session_id: _session_id,
          ...restQuery
        } = query
        void replace(
          {
            pathname: `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}`,
            query: restQuery,
          },
          undefined,
          { shallow: true }
        )
      } else if (checkoutValue === 'cancel') {
        showInfoToast('Payment cancelled', 'You can try again anytime.')
        // Clean up query parameters
        const { checkout: _checkout, ...restQuery } = query
        void replace(
          {
            pathname: `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}`,
            query: restQuery,
          },
          undefined,
          { shallow: true }
        )
      }
    } else if (!checkoutValue) {
      // Reset the ref when checkout is cleared
      processedCheckoutRef.current = undefined
    }
  }, [checkout, query])

  // Handle Stripe Customer Portal return redirect
  useEffect(() => {
    if (portal_success === 'true') {
      showSuccessToast(
        'Subscription updated successfully',
        'Your subscription changes have been saved.'
      )
      void updateUser()
      // Clean up query parameter
      const { portal_success: _portal_success, ...restQuery } = query
      void replace(
        {
          pathname: `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}`,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      )
    }
  }, [portal_success, query])

  const syncCurrentSubscriptions = async () => {
    const subs = await syncSubscriptions()
    if (subs?.length) {
      if (subs[0].plan_id === Plan.PRO) {
        setCurrentPlan(Plan.PRO)
      }
    }
  }

  // Fetch subscription history with pagination
  const {
    data: subscriptionHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['subscriptionHistory', currentAccount?.address, historyPage],
    queryFn: () =>
      getSubscriptionHistory(
        HISTORY_PER_PAGE,
        (historyPage - 1) * HISTORY_PER_PAGE
      ),
    enabled: !!currentAccount?.address,
    staleTime: 60000, // 1 minute
  })

  const goToBilling = (mode?: BillingMode, planName?: string) => {
    const queryParams = new URLSearchParams()
    if (mode) queryParams.set('mode', mode)
    if (planName) queryParams.set('plan', planName)
    const queryString = queryParams.toString()
    void push(
      `/dashboard/settings/${SettingsSection.SUBSCRIPTIONS}/billing${
        queryString ? `?${queryString}` : ''
      }`
    )
  }

  const handlePrimaryButtonClick = () => {
    if (hasActiveSubscription) {
      if (paymentProvider !== PaymentProvider.STRIPE) {
        goToBilling(BillingMode.EXTEND, billingPlanLabel)
      }
    } else {
      goToBilling(BillingMode.SUBSCRIBE, getPlanInfo(Plan.PRO)?.name ?? 'Plan')
    }
  }

  const handleManageSubscription = async () => {
    setManageSubscriptionLoading(true)
    try {
      const url = await getManageSubscriptionUrl()
      window.open(url, '_blank', 'noopener,noreferrer')
      setManageSubscriptionLoading(false)
    } catch (e) {
      handleApiError('Failed to open Stripe portal', e)
      setManageSubscriptionLoading(false)
    }
  }

  // Cancel crypto subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => cancelCryptoSubscription(),
    onSuccess: async () => {
      await updateUser()
    },
    onError: (err: unknown) => {
      handleApiError('Failed to cancel subscription', err)
    },
  })

  const handleCancelSubscription = async () => {
    await cancelSubscriptionMutation.mutateAsync()
  }

  // Check if user has an active subscription
  const hasActiveSubscription =
    billingSubscription &&
    new Date(billingSubscription.expiry_time) > new Date()

  const isProCardActive = hasActiveSubscription || currentPlan === Plan.PRO

  const activeBadge =
    isCryptoTrial && hasActiveSubscription
      ? 'Trial'
      : hasActiveSubscription &&
        (billingStatus === 'active' || billingStatus === 'cancelled')
      ? 'Active'
      : undefined

  const currentExpiryText = billingExpiry
    ? `Your current plan is valid until ${billingExpiry} (${
        billingPlanLabel.toLowerCase().includes('year')
          ? 'Yearly Plan'
          : 'Monthly Plan'
      })`
    : undefined

  // Compute CTA props for SubscriptionCard
  const proCardCtaProps = React.useMemo(() => {
    const primaryCtaLabel = hasActiveSubscription
      ? paymentProvider === PaymentProvider.STRIPE
        ? undefined
        : 'Extend Plan'
      : 'Subscribe to Pro'

    const secondaryCtaLabel =
      hasActiveSubscription && paymentProvider === PaymentProvider.STRIPE
        ? 'Manage Subscription'
        : undefined

    const onSecondaryCta =
      hasActiveSubscription && paymentProvider === PaymentProvider.STRIPE
        ? () => void handleManageSubscription()
        : undefined

    const tertiaryCtaLabel =
      hasActiveSubscription && paymentProvider !== PaymentProvider.STRIPE
        ? isCryptoTrial
          ? 'Cancel Trial'
          : 'Cancel Subscription'
        : undefined

    const onTertiaryCta =
      hasActiveSubscription && paymentProvider !== PaymentProvider.STRIPE
        ? onCancelModalOpen
        : undefined

    return {
      primaryCtaLabel,
      secondaryCtaLabel,
      onSecondaryCta,
      secondaryCtaLoading: manageSubscriptionLoading,
      tertiaryCtaLabel,
      onTertiaryCta,
      tertiaryCtaLoading: cancelSubscriptionMutation.isLoading,
    }
  }, [
    hasActiveSubscription,
    paymentProvider,
    isCryptoTrial,
    manageSubscriptionLoading,
    cancelSubscriptionMutation.isLoading,
    onCancelModalOpen,
  ])

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Heading fontSize="2xl">Account Plans & Billing</Heading>

      <Block>
        <Heading ref={subsRef} fontSize="2xl" id="subscriptions" mb={8}>
          Subscription
        </Heading>

        {hasBillingError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            <Box flex={1}>
              <AlertDescription display="inline">
                Failed to load subscription information.{' '}
              </AlertDescription>
              <Button
                variant="link"
                colorScheme="red"
                size="sm"
                onClick={() => void refetchBillingDetails()}
                ml={2}
                display="inline"
              >
                Try again
              </Button>
            </Box>
          </Alert>
        )}

        {billingFetching || historyLoading ? (
          <Box width="100%">
            <CustomLoading text="Loading subscription..." />
          </Box>
        ) : (
          <Flex
            width="100%"
            flexDirection={{ base: 'column', md: 'row' }}
            gridGap={2}
          >
            <SubscriptionCard
              subscription={blockchainSubscription}
              planInfo={getPlanInfo(Plan.PRO)}
              active={isProCardActive}
              benefits={PRO_PLAN_BENEFITS}
              badge={activeBadge}
              expiryText={currentExpiryText}
              onClick={handlePrimaryButtonClick}
              {...proCardCtaProps}
            />
            <SubscriptionCard
              onClick={() =>
                goToBilling(
                  BillingMode.SUBSCRIBE,
                  getPlanInfo(Plan.PRO)?.name ?? 'Plan'
                )
              }
              active={!isProCardActive}
              benefits={FREE_PLAN_BENEFITS}
            />
          </Flex>
        )}

        <CouponUsedModal
          couponCode={couponCode}
          couponDuration={couponDuration}
          isDialogOpen={isOpen}
          onDialogClose={onClose}
        />

        {/* Payment History - Show if user has subscription history */}
        {!billingFetching && (subscriptionHistory?.total ?? 0) > 0 && (
          <Accordion allowToggle mt={10} borderColor="neutral.700">
            <AccordionItem
              border="1px solid"
              borderColor="neutral.700"
              borderRadius="md"
              overflow="hidden"
            >
              <h2>
                <AccordionButton
                  px={4}
                  py={4}
                  bg="transparent"
                  _expanded={{ bg: 'transparent' }}
                >
                  <Box flex="1" textAlign="left">
                    <Heading
                      fontSize="22px"
                      fontWeight="700"
                      color="text-primary"
                    >
                      Payment History
                    </Heading>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel p={0}>
                <Table variant="simple" size="md">
                  <Thead bg="transparent">
                    <Tr borderBottom="1px solid" borderColor="neutral.700">
                      <Th fontSize="16px" color="text-primary">
                        Plan
                      </Th>
                      <Th fontSize="16px" color="text-primary">
                        Date
                      </Th>
                      <Th fontSize="16px" color="text-primary">
                        Payment method
                      </Th>
                      <Th fontSize="16px" color="text-primary" isNumeric>
                        Amount
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {historyLoading ? (
                      <Tr>
                        <Td colSpan={4} textAlign="center" py={8}>
                          <CustomLoading text="Loading payment history..." />
                        </Td>
                      </Tr>
                    ) : historyError ? (
                      <Tr>
                        <Td
                          colSpan={4}
                          textAlign="center"
                          py={8}
                          color="red.500"
                        >
                          Failed to load payment history
                        </Td>
                      </Tr>
                    ) : subscriptionHistory?.items &&
                      subscriptionHistory.items.length > 0 ? (
                      subscriptionHistory.items.map(
                        (row: SubscriptionHistoryItem, idx: number) => (
                          <Tr
                            key={`${row.plan}-${row.date}-${idx}`}
                            borderColor="neutral.700"
                            _last={{ td: { borderBottom: 'none' } }}
                          >
                            <Td color="text-primary" fontWeight="600">
                              {row.plan}
                            </Td>
                            <Td color="text-primary">{row.date}</Td>
                            <Td color="text-primary">{row.paymentMethod}</Td>
                            <Td color="text-primary" isNumeric>
                              {row.amount}
                            </Td>
                          </Tr>
                        )
                      )
                    ) : (
                      <Tr>
                        <Td
                          colSpan={4}
                          textAlign="center"
                          py={8}
                          color="text-secondary"
                        >
                          No payment history found
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
                {subscriptionHistory && subscriptionHistory.totalPages > 1 && (
                  <Box p={4}>
                    <Pagination
                      currentPage={subscriptionHistory.page}
                      totalPages={subscriptionHistory.totalPages}
                      onPageChange={setHistoryPage}
                      isLoading={historyLoading}
                    />
                  </Box>
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </Block>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={onCancelModalClose}
        onCancel={handleCancelSubscription}
        isLoading={cancelSubscriptionMutation.isLoading}
        expiryDate={billingExpiry || undefined}
      />
    </VStack>
  )
}

interface SubscriptionCardProps {
  active: boolean
  benefits: string[]
  subscription?: Subscription
  planInfo?: PlanInfo
  onClick: () => void
  badge?: string
  expiryText?: string
  primaryCtaLabel?: string
  secondaryCtaLabel?: string
  onSecondaryCta?: () => void
  secondaryCtaLoading?: boolean
  tertiaryCtaLabel?: string
  onTertiaryCta?: () => void
  tertiaryCtaLoading?: boolean
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  active,
  subscription,
  planInfo,
  benefits,
  onClick,
  badge,
  expiryText,
  primaryCtaLabel,
  secondaryCtaLabel,
  onSecondaryCta,
  secondaryCtaLoading = false,
  tertiaryCtaLabel,
  onTertiaryCta,
  tertiaryCtaLoading = false,
}) => {
  return (
    <VStack
      shadow="sm"
      flex={1}
      bg={useColorModeValue('gray.50', 'gray.700')}
      me={4}
      borderRadius={8}
      borderWidth={2}
      p={4}
      minWidth="240px"
      maxWidth="350px"
      minHeight="500px"
      alignItems={'flex-start'}
      justifyContent={'space-between'}
      borderColor={active ? '#F35826' : 'transparent'}
    >
      <HStack width="100%" justify="space-between" align="center">
        <HStack flex={1}>
          <Box>
            <FaTag color={useColorModeValue('#fff', '#fff')} />
          </Box>
          <Text textAlign="left" fontWeight={500}>
            {planInfo
              ? `${planInfo.name} - $${planInfo.usdPrice} / month`
              : 'Free - $0 / forever'}
          </Text>
        </HStack>
        {badge && (
          <Badge
            bg="green.200"
            color="green.600"
            px={3}
            py={1.5}
            borderRadius="10px"
            fontSize="xs"
            fontWeight="500"
            textTransform="none"
          >
            {badge}
          </Badge>
        )}
      </HStack>
      <Box ml="24px">
        <UnorderedList fontSize="sm">
          {benefits.map((benefit, i) => (
            <ListItem key={i}>{benefit}</ListItem>
          ))}
        </UnorderedList>
      </Box>

      <Box width="100%" mt="auto">
        {expiryText && (
          <Text fontSize="sm" fontWeight={500} color="text-primary" mb={3}>
            {expiryText}
          </Text>
        )}
        {planInfo &&
          (primaryCtaLabel || secondaryCtaLabel || tertiaryCtaLabel) && (
            <VStack spacing={2} width="100%">
              {primaryCtaLabel && (
                <Button width="full" colorScheme="primary" onClick={onClick}>
                  {primaryCtaLabel}
                </Button>
              )}
              {secondaryCtaLabel && onSecondaryCta && (
                <Button
                  width="full"
                  variant="outline"
                  borderColor="red.500"
                  color="red.500"
                  onClick={onSecondaryCta}
                  isLoading={secondaryCtaLoading}
                  loadingText="Loading..."
                >
                  {secondaryCtaLabel}
                </Button>
              )}
              {tertiaryCtaLabel && onTertiaryCta && (
                <Button
                  width="full"
                  variant="outline"
                  borderColor="red.500"
                  color="red.500"
                  onClick={onTertiaryCta}
                  isLoading={tertiaryCtaLoading}
                  loadingText="Loading..."
                >
                  {tertiaryCtaLabel}
                </Button>
              )}
            </VStack>
          )}
      </Box>
    </VStack>
  )
}

export default AccountPlansAndBilling
