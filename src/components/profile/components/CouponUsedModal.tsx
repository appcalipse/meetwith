import {
  Button,
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
import React from 'react'

interface CouponUsedProps {
  isDialogOpen: boolean
  onDialogClose: () => void
  couponCode: string
  couponDuration: number
}
const CouponUsedModal = (props: CouponUsedProps) => {
  return (
    <Modal
      blockScrollOnMount={false}
      size={'xl'}
      isOpen={props.isDialogOpen}
      onClose={props.onDialogClose}
      isCentered
    >
      <ModalOverlay />
      <ModalContent backgroundColor={'neutral.900'} color={'neutral.200'}>
        <ModalHeader>Subscription successful</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack py="8" gap="6">
            <Image
              src="/assets/check.svg"
              width={{ md: 100, base: 75 }}
              height={{ md: 100, base: 75 }}
              alt="Success Check"
            />
            <Text
              fontSize={{ md: 24, base: 20 }}
              color="neutral.200"
              textAlign={'center'}
            >
              You have successfully subscribed to{' '}
              <Text fontWeight={'500'} display={'inline'}>
                {props.couponDuration} months
              </Text>{' '}
              Premium access to Meetwith. Enjoy easy scheduling.
            </Text>
            <Text
              fontSize={{ md: 20, base: 16 }}
              textAlign={'center'}
              color="neutral.300"
            >
              You can share the {props.couponDuration} months free offer with
              your friends.
            </Text>
            <Button
              bg="primary.500"
              color="white"
              onClick={() => {
                navigator.share({
                  title: 'Meetwith',
                  text: `Get ${props.couponDuration} months free premium access to Meetwith with this coupon code "${props.couponCode}"`,
                  url: 'https://www.meetwith.xyz',
                })
              }}
            >
              Share Coupon
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default CouponUsedModal
