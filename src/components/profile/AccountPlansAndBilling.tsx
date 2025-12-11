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
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaTag } from 'react-icons/fa'
import { useActiveWallet } from 'thirdweb/react'

import CustomLoading from '@/components/CustomLoading'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account } from '@/types/Account'
import { EditMode, Intents, SettingsSection } from '@/types/Dashboard'
import { getPlanInfo, Plan, PlanInfo, Subscription } from '@/types/Subscription'
import { logEvent } from '@/utils/analytics'
import {
  getActiveSubscription,
  getManageSubscriptionUrl,
  syncSubscriptions,
} from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { isProAccount } from '@/utils/subscription_manager'

import Block from './components/Block'
import CouponUsedModal from './components/CouponUsedModal'

const AccountPlansAndBilling: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  // Constants
  const DEFAULT_COUPON_DURATION_MONTHS = 3
  const PURCHASE_SUCCESS_TIMEOUT_MS = 10000

  const { login } = useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)
  const toast = useToast()
  const { query, push } = useRouter()
  const { intent, coupon } = query
  const activeWallet = useActiveWallet()

  const subsRef = useRef<any>(null)

  const [loading, setLoading] = useState(false)
  const [manageSubscriptionLoading, setManageSubscriptionLoading] =
    useState(false)
  const [purchased, setPurchased] = useState<Subscription | undefined>(
    undefined
  )
  const [currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [couponCode, setCouponCode] = useState('')
  const [couponDuration, setCouponDuration] = useState(0)

  // Fetch billing subscription using React Query
  const {
    data: billingSubscription,
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

  // Derive billing plan label, status, and expiry from subscription data
  const billingPlanLabel = billingSubscription?.billing_plan_id
    ? billingSubscription.billing_plan_id.toLowerCase().includes('year')
      ? 'Pro – $80/year'
      : 'Pro – $8/month'
    : 'Meetwith PRO'

  const billingStatus = billingSubscription?.status ?? null

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

  const syncCurrentSubscriptions = async () => {
    const subs = await syncSubscriptions()
    if (subs?.length) {
      if (subs[0].plan_id === Plan.PRO) {
        setCurrentPlan(Plan.PRO)
      }
    }
  }

  const subsPurchased = (sub: Subscription) => {
    setPurchased(sub)
    setCurrentPlan(Plan.PRO)
    void syncCurrentSubscriptions()
    setTimeout(() => setPurchased(undefined), PURCHASE_SUCCESS_TIMEOUT_MS)
  }

  // Dummy subscription periods data for UI preview
  const dummySubscriptionHistory = [
    {
      plan: 'Meetwith PRO (Monthly)',
      date: '21/8/2025',
      paymentMethod: 'Fiat',
      amount: '$8',
    },
    {
      plan: 'Meetwith PRO (Monthly)',
      date: '21/7/2025',
      paymentMethod: 'Fiat',
      amount: '$8',
    },
  ]

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

  const handleManageSubscription = async () => {
    setManageSubscriptionLoading(true)
    try {
      const url = await getManageSubscriptionUrl()
      window.location.href = url
    } catch (e) {
      handleApiError('Failed to open Stripe portal', e)
      setManageSubscriptionLoading(false)
    }
  }

  // Check if user has an active subscription
  const hasActiveSubscription =
    billingSubscription &&
    (billingStatus === 'active' || billingStatus === 'cancelled') &&
    billingSubscription.expiry_time &&
    new Date(billingSubscription.expiry_time) > new Date()

  const activeBadge =
    billingStatus === 'active' || billingStatus === 'cancelled'
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

        {purchased && !isOpen && (
          <Alert status="success">
            <AlertIcon />
            Subscription successful. Enjoy your {
              getPlanInfo(Plan.PRO)?.name
            }{' '}
            Plan
          </Alert>
        )}

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

        <Flex
          width="100%"
          flexDirection={{ base: 'column', md: 'row' }}
          gridGap={2}
        >
          {billingLoading ? (
            <Box flex={1} minWidth="240px" maxWidth="350px">
              <CustomLoading text="Loading subscription..." />
            </Box>
          ) : (
            <SubscriptionCard
              subscription={currentAccount?.subscriptions?.find(
                sub => new Date(sub.expiry_time) > new Date()
              )}
              planInfo={getPlanInfo(Plan.PRO)}
              onClick={() =>
                goToBilling('extend', getPlanInfo(Plan.PRO)?.name ?? 'Plan')
              }
              active={currentPlan === Plan.PRO}
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
                hasActiveSubscription ? 'Extend Plan' : 'Subscribe'
              }
              secondaryCtaLabel={
                hasActiveSubscription ? 'Manage Subscription' : undefined
              }
              onSecondaryCta={
                hasActiveSubscription
                  ? () => void handleManageSubscription()
                  : undefined
              }
              secondaryCtaLoading={manageSubscriptionLoading}
            />
          )}
          <SubscriptionCard
            onClick={() =>
              goToBilling('subscribe', getPlanInfo(Plan.PRO)?.name ?? 'Plan')
            }
            active={currentPlan === undefined}
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

        <CouponUsedModal
          couponCode={couponCode}
          couponDuration={couponDuration}
          isDialogOpen={isOpen}
          onDialogClose={onClose}
        />

        {/* Payment History (dummy data for now) */}
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
                  {dummySubscriptionHistory.map((row, idx) => (
                    <Tr
                      key={`${row.plan}-${idx}`}
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
                  ))}
                </Tbody>
              </Table>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
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
            bg="#00CE5D"
            color="white"
            px={2}
            py={1}
            borderRadius="4px"
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

      {expiryText && (
        <Text fontSize="sm" fontWeight={500} color="text-primary">
          {expiryText}
        </Text>
      )}

      <Box width="100%" mt="auto">
        {planInfo && primaryCtaLabel && (
          <VStack spacing={2} width="100%">
            <Button width="full" colorScheme="primary" onClick={onClick}>
              {primaryCtaLabel}
            </Button>
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
