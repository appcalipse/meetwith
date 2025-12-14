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
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { FaTag } from 'react-icons/fa'

import CustomLoading from '@/components/CustomLoading'
import Pagination from '@/components/profile/Pagination'
import { Account } from '@/types/Account'
import { PaymentProvider, SubscriptionHistoryItem } from '@/types/Billing'
import { EditMode, Intents, SettingsSection } from '@/types/Dashboard'
import { getPlanInfo, Plan, PlanInfo, Subscription } from '@/types/Subscription'
import {
  getActiveSubscription,
  getManageSubscriptionUrl,
  getSubscriptionHistory,
  syncSubscriptions,
} from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

import Block from './components/Block'
import CouponUsedModal from './components/CouponUsedModal'

const AccountPlansAndBilling: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  // Constants
  const DEFAULT_COUPON_DURATION_MONTHS = 3

  const { showSuccessToast, showInfoToast } = useToastHelpers()
  const { query, push, replace } = useRouter()
  const { intent, coupon, checkout, portal_success } = query

  const subsRef = useRef<any>(null)
  const [manageSubscriptionLoading, setManageSubscriptionLoading] =
    useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [couponCode, setCouponCode] = useState('')
  const [couponDuration, setCouponDuration] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const HISTORY_PER_PAGE = 10

  // Fetch billing subscription using React Query
  const {
    data: billingSubscriptionResponse,
    isLoading: billingLoading,
    error: billingError,
    refetch: refetchBilling,
  } = useQuery({
    queryKey: ['billingSubscription', currentAccount?.address],
    queryFn: () => getActiveSubscription(currentAccount!.address),
    enabled: !!currentAccount?.address,
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    onError: (err: unknown) => {
      handleApiError('Failed to load subscription', err)
    },
  })

  // Extract subscription data from response
  const billingSubscription = billingSubscriptionResponse?.subscription ?? null
  const billingPlan = billingSubscriptionResponse?.billing_plan ?? null

  // Derive billing plan label, status, and expiry from subscription data
  const billingPlanLabel = billingPlan
    ? billingPlan.billing_cycle === 'yearly'
      ? 'Pro – $80/year'
      : 'Pro – $8/month'
    : 'Meetwith PRO'

  const billingStatus = billingSubscription?.status ?? null

  const billingExpiry = billingSubscriptionResponse?.expires_at
    ? format(new Date(billingSubscriptionResponse.expires_at), 'PPP')
    : null

  // Check if there's an error
  const hasBillingError = billingError != null

  const handleIntents = () => {
    if (intent === Intents.USE_COUPON) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (coupon) {
        setCouponCode(coupon.toString())
        setCouponDuration(DEFAULT_COUPON_DURATION_MONTHS)
        void push(`/dashboard/${EditMode.DETAILS}`)
        onOpen()
      }
    } else if (intent === Intents.SUBSCRIBE_PRO) {
      subsRef.current?.scrollIntoView({ behavior: 'smooth' })
      void push(
        `/dashboard/${SettingsSection.SUBSCRIPTIONS}/billing`,
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
    if (checkout === 'success') {
      showSuccessToast('Subscription successful!', 'Welcome to Pro!')
      // Refetch subscription data
      void refetchBilling()
      // Clean up query parameters
      const {
        checkout: _checkout,
        session_id: _session_id,
        ...restQuery
      } = query
      void replace(
        {
          pathname: `/dashboard/${SettingsSection.SUBSCRIPTIONS}`,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      )
    } else if (checkout === 'cancel') {
      showInfoToast('Payment cancelled', 'You can try again anytime.')
      // Clean up query parameters
      const { checkout: _checkout, ...restQuery } = query
      void replace(
        {
          pathname: `/dashboard/${SettingsSection.SUBSCRIPTIONS}`,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      )
    }
  }, [
    checkout,
    query,
    replace,
    refetchBilling,
    showSuccessToast,
    showInfoToast,
  ])

  // Handle Stripe Customer Portal return redirect
  useEffect(() => {
    if (portal_success === 'true') {
      showSuccessToast(
        'Subscription updated successfully',
        'Your subscription changes have been saved.'
      )
      // Refetch subscription data
      void refetchBilling()
      // Clean up query parameter
      const { portal_success: _portal_success, ...restQuery } = query
      void replace(
        {
          pathname: `/dashboard/${SettingsSection.SUBSCRIPTIONS}`,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      )
    }
  }, [portal_success, query, replace, refetchBilling, showSuccessToast])

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

  const goToBilling = (mode?: 'extend' | 'subscribe', planName?: string) => {
    const queryParams = new URLSearchParams()
    if (mode) queryParams.set('mode', mode)
    if (planName) queryParams.set('plan', planName)
    const queryString = queryParams.toString()
    void push(
      `/dashboard/${SettingsSection.SUBSCRIPTIONS}/billing${
        queryString ? `?${queryString}` : ''
      }`
    )
  }

  const handlePrimaryButtonClick = () => {
    if (hasActiveSubscription) {
      if (
        billingSubscriptionResponse?.payment_provider !== PaymentProvider.STRIPE
      ) {
        goToBilling('extend', billingPlanLabel)
      }
    } else {
      goToBilling('subscribe', getPlanInfo(Plan.PRO)?.name ?? 'Plan')
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

  // Check if user has an active subscription
  const hasActiveSubscription =
    billingSubscriptionResponse?.is_active === true ||
    (billingSubscription &&
      (billingStatus === 'active' || billingStatus === 'cancelled') &&
      billingSubscription.expiry_time &&
      new Date(billingSubscription.expiry_time) > new Date())

  const isProCardActive = hasActiveSubscription || currentPlan === Plan.PRO

  const activeBadge =
    hasActiveSubscription &&
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
                onClick={() => void refetchBilling()}
                ml={2}
                display="inline"
              >
                Try again
              </Button>
            </Box>
          </Alert>
        )}

        {billingLoading ? (
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
              subscription={
                // Use blockchain subscription if no billing subscription exists
                !billingSubscription
                  ? currentAccount?.subscriptions?.find(
                      sub => new Date(sub.expiry_time) > new Date()
                    )
                  : undefined
              }
              planInfo={getPlanInfo(Plan.PRO)}
              active={isProCardActive}
              benefits={[
                'Everything in Free plus (+)',
                'Unlimited scheduling groups',
                'Payments & Invoicing',
                'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
                'Unlimited QuickPolls',
                'Unlimited meeting types - Free & Paid',
                '24/7 priority support',
              ]}
              badge={activeBadge}
              expiryText={currentExpiryText}
              primaryCtaLabel={
                hasActiveSubscription
                  ? billingSubscriptionResponse?.payment_provider ===
                    PaymentProvider.STRIPE
                    ? undefined
                    : 'Extend Plan'
                  : 'Subscribe to Pro'
              }
              onClick={handlePrimaryButtonClick}
              secondaryCtaLabel={
                hasActiveSubscription &&
                billingSubscriptionResponse?.payment_provider ===
                  PaymentProvider.STRIPE
                  ? 'Manage Subscription'
                  : undefined
              }
              onSecondaryCta={
                hasActiveSubscription &&
                billingSubscriptionResponse?.payment_provider ===
                  PaymentProvider.STRIPE
                  ? () => void handleManageSubscription()
                  : undefined
              }
              secondaryCtaLoading={manageSubscriptionLoading}
            />
            <SubscriptionCard
              onClick={() =>
                goToBilling('subscribe', getPlanInfo(Plan.PRO)?.name ?? 'Plan')
              }
              active={!isProCardActive}
              benefits={[
                'Personal scheduling page',
                '1 Meeting type - FREE meetings',
                'Custom account handle',
                '5 scheduling groups',
                'Limited QuickPolls (max. 2 active polls per time)',
                'Basic calendar sync - 1 calendar sync only',
                'Smart notifications — Email, Discord, and Telegram let you set the cadence for each meeting type.',
                'Unlimited contact connection',
                'Email support',
              ]}
            />
          </Flex>
        )}

        <CouponUsedModal
          couponCode={couponCode}
          couponDuration={couponDuration}
          isDialogOpen={isOpen}
          onDialogClose={onClose}
        />

        {/* Payment History - Only show if user has subscription history */}
        {!billingLoading &&
          ((hasActiveSubscription && (historyLoading || historyError)) ||
            (subscriptionHistory?.total ?? 0) > 0) && (
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
                  {subscriptionHistory &&
                    subscriptionHistory.totalPages > 1 && (
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
        {planInfo && (primaryCtaLabel || secondaryCtaLabel) && (
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
          </VStack>
        )}
      </Box>
    </VStack>
  )
}

export default AccountPlansAndBilling
