import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'
import Countdown, { CountdownRenderProps } from 'react-countdown'
import { BiCopy } from 'react-icons/bi'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { EditMode, Intents } from '@/types/Dashboard'
import { Coupon } from '@/types/Subscription'
import { COUPON_CAMPAIGN_END_DATE } from '@/utils/constants/coupons'
interface ProAccessPopUpProps {
  isDialogOpen: boolean
  onDialogClose: () => void
  coupon: Coupon | undefined
}
const ProAccessPopUp = (props: ProAccessPopUpProps) => {
  const { logged } = useContext(AccountContext)
  const { openConnection } = useContext(OnboardingModalContext)
  const { push } = useRouter()
  const onClaim = () => {
    if (logged) {
      push(
        `/dashboard/${EditMode.DETAILS}?coupon=${props?.coupon?.code}&intent=${Intents.USE_COUPON}`
      )
    } else {
      openConnection(
        `/dashboard/${EditMode.DETAILS}?coupon=${props?.coupon?.code}&intent=${Intents.USE_COUPON}`
      )
    }
    props.onDialogClose()
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
          sx={{
            background: 'linear-gradient( #F35826, #F78C69)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
          }}
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
      isOpen={props.isDialogOpen}
      onClose={props.onDialogClose}
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
            <Image width="52px" src="/assets/logo.svg" alt="Meetwith" />
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
                        navigator.clipboard.writeText(props?.coupon?.code || '')
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                  >
                    {props?.coupon?.code}
                  </Button>
                </VStack>
                <HStack width={'100%'} h={'1px'} bg="neutral.600" />
                <VStack alignItems="flex-start" gap={4}>
                  <Text color="white" fontWeight="500">
                    {props.coupon?.claims} / {props.coupon?.max_users} claims
                  </Text>
                  <Button color="primary.50" bg="primary.500" onClick={onClaim}>
                    Claim offer
                  </Button>
                </VStack>
              </VStack>
            </HStack>
            <Box insetX="-7" position={'absolute'} bottom="-2">
              <Image alt="abstracts" src="/assets/abstracts.svg" w="100%" />
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ProAccessPopUp
