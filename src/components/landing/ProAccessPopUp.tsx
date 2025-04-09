import {
  Box,
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import Countdown, { CountdownRenderProps } from 'react-countdown'
import { BiCopy } from 'react-icons/bi'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { EditMode, Intents } from '@/types/Dashboard'
import { Coupon } from '@/types/Subscription'
import { getNewestCoupon } from '@/utils/api_helper'
import { COUPON_CAMPAIGN_END_DATE } from '@/utils/constants/coupons'
import { isProAccount } from '@/utils/subscription_manager'

const ProAccessPopUp = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { logged, currentAccount } = useContext(AccountContext)

  const [coupon, setCoupon] = useState<Coupon | undefined>(undefined)
  const controller = new AbortController()

  const signal = controller.signal
  const fetchCoupon = async () => {
    const data = await getNewestCoupon(signal)
    setCoupon(data)
    onOpen()
  }
  useEffect(() => {
    return () => {
      controller.abort()
    }
  }, [])
  const handleCoupon = () => {
    if (
      (logged && isProAccount(currentAccount ?? undefined)) ||
      Date.now() > COUPON_CAMPAIGN_END_DATE
    ) {
      onClose()
      return
    }
    setTimeout(() => {
      // Display after 5 seconds so that the user has time to load the page
      void fetchCoupon()
    }, 5000)
  }
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.requestIdleCallback) {
      window.requestIdleCallback(handleCoupon)
    } else {
      setTimeout(handleCoupon, 1)
    }
  }, [currentAccount])

  const { openConnection } = useContext(OnboardingModalContext)
  const { push } = useRouter()
  const onClaim = () => {
    if (logged) {
      push(
        `/dashboard/${EditMode.DETAILS}?coupon=${coupon?.code}&intent=${Intents.USE_COUPON}`
      )
    } else {
      openConnection(
        `/dashboard/${EditMode.DETAILS}?coupon=${coupon?.code}&intent=${Intents.USE_COUPON}`
      )
    }
    onClose()
  }
  const renderer = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: CountdownRenderProps) => {
    if (completed) {
      return null
    } else {
      // Render a countdown
      return (
        <Heading
          as="h2"
          size="2xl"
          textAlign="left"
          lineHeight={1.2}
          background="linear-gradient( #F35826, #F78C69)"
          backgroundClip="text"
          textColor="transparent"
          display="flex"
          alignItems="flex-start"
        >
          <VStack gap={0}>
            <Text>{days}</Text>
            <Text fontSize={'sm'}>days</Text>
          </VStack>
          :
          <VStack gap={0}>
            <Text>{hours}</Text>
            <Text fontSize={'sm'}>hrs</Text>
          </VStack>
          :
          <VStack gap={0}>
            <Text>{minutes}</Text>
            <Text fontSize={'sm'}>mins</Text>
          </VStack>
          :
          <VStack gap={0}>
            <Text>{seconds}</Text>
            <Text fontSize={'sm'}>secs</Text>
          </VStack>
        </Heading>
      )
    }
  }
  return (
    <Modal
      blockScrollOnMount={false}
      size={{ md: '3xl', base: 'lg' }}
      isOpen={isOpen}
      onClose={onClose}
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        backgroundColor={'neutral.900'}
        color={'neutral.200'}
        className="gradient-border"
      >
        <ModalBody zIndex={100} bg="#1F2933">
          <ModalHeader px={0}>
            <Image
              width={53}
              height={33}
              src="/assets/logo.svg"
              alt="Meetwith"
            />
          </ModalHeader>
          <ModalCloseButton top="25px" size={'lg'} />
          <VStack pb={24} position="relative" pt="8">
            <HStack
              alignItems={{ md: 'flex-start', base: 'center' }}
              w="100%"
              justifyContent="space-between"
              flexDir={{ base: 'column', md: 'row' }}
            >
              <VStack flexBasis={'50%'}>
                <Heading
                  as="h2"
                  size="2xl"
                  textAlign="left"
                  lineHeight={1.2}
                  sx={{
                    background: 'linear-gradient( #F35826, #F78C69)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                  }}
                >
                  Get 6 months FREE access to PRO Meetwith
                </Heading>
                <Text color="white" fontWeight="500">
                  Experience easy scheduling for a simple ask from us? Give us
                  feedback on your experience.
                </Text>
              </VStack>
              <VStack
                flexBasis={'45%'}
                alignItems={{ md: 'flex-start', base: 'center' }}
                gap="4"
                mt="2"
              >
                <VStack alignItems={{ md: 'flex-start', base: 'center' }}>
                  <Countdown
                    date={COUPON_CAMPAIGN_END_DATE}
                    renderer={renderer}
                  />
                  <Text color="white" fontWeight="500">
                    Use this coupon code to claim the offer
                  </Text>
                  <Button
                    rightIcon={<BiCopy size={25} />}
                    colorScheme="green"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(coupon?.code || '')
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                  >
                    {coupon?.code}
                  </Button>
                </VStack>
                <HStack width={'100%'} h={'1px'} bg="neutral.600" />
                <VStack alignItems="flex-start" gap={4}>
                  <Text color="white" fontWeight="500">
                    {coupon?.claims} / {coupon?.max_users} claims
                  </Text>
                  <Button color="primary.50" bg="primary.500" onClick={onClaim}>
                    Claim offer
                  </Button>
                </VStack>
              </VStack>
            </HStack>
            <Box insetX="-7" position={'absolute'} bottom="-2">
              <Image
                alt="abstracts"
                src="/assets/abstracts.svg"
                style={{
                  width: '100%',
                }}
                width={804}
                height={77}
              />
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ProAccessPopUp
