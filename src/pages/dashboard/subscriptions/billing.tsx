import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  HStack,
  Stack,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { SubscribeRequest } from '@/types/Billing'
import { getBillingPlans, subscribeToBillingPlan } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

const BillingCheckout = () => {
  const router = useRouter()
  const [isYearly, setIsYearly] = useState(false)
  const { mode, plan } = router.query

  const monthlyPrice = 8
  const yearlyPrice = 80
  const subtotal = isYearly ? yearlyPrice : monthlyPrice

  const planName =
    typeof plan === 'string' && plan.length > 0 ? plan : 'Meetwith PRO'
  const heading =
    mode === 'extend'
      ? `Extend my ${planName}`
      : 'Subscribe to Meetwith Premium'

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

  // Subscribe mutation
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

  const handlePayWithCard = async () => {
    // Find the billing plan ID based on isYearly
    const selectedPlan = plans.find(
      plan => plan.billing_cycle === (isYearly ? 'yearly' : 'monthly')
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
      billing_plan_id: selectedPlan.id,
      payment_method: 'stripe',
    }

    try {
      await subscribeMutation.mutateAsync(request)
    } catch (error) {
      throw error
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
              name="Pay with Card"
              tag="Your fiat cards"
              step={PaymentStep.SELECT_PAYMENT_METHOD}
              icon={FiatLogo}
              type={PaymentType.FIAT}
              disabled={isLoadingPlans || subscribeMutation.isLoading}
              onClick={handlePayWithCard}
            />
            <PaymentMethod
              id="crypto"
              name="Pay with crypto"
              step={PaymentStep.SELECT_CRYPTO_NETWORK}
              icon={ChainLogo}
              type={PaymentType.CRYPTO}
              onClick={async () => {
                // TODO: integrate crypto billing checkout
              }}
            />
          </Stack>
        </VStack>
      </VStack>
    </Container>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(BillingCheckout))
