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
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'

const BillingCheckout = () => {
  const router = useRouter()
  const [isYearly, setIsYearly] = useState(false)

  const monthlyPrice = 8
  const yearlyPrice = 80
  const subtotal = isYearly ? yearlyPrice : monthlyPrice

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
            Subscribe to Meetwith Premium
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
                Meetwith PRO
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
              onClick={async () => {
                // TODO: integrate billing checkout session
              }}
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
