import {
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
import React from 'react'
interface ProAccessPopUpProps {
  isDialogOpen: boolean
  onDialogClose: () => void
}
const ProAccessPopUp = (props: ProAccessPopUpProps) => {
  return (
    <Modal
      blockScrollOnMount={false}
      size={'2xl'}
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
            <Image
              width={{ md: '75px', base: '50px' }}
              src="/assets/logo.svg"
              alt="Meetwith"
            />
          </ModalHeader>
          <ModalCloseButton top="25px" />
          <VStack>
            <HStack>
              <VStack flexBasis={'50%'}>
                <Heading
                  as="h2"
                  size="xl"
                  textAlign="left"
                  sx={{
                    background: 'linear-gradient( #F35826, #F78C69)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                  }}
                >
                  Get 6 months FREE access to PRO Meetwith
                </Heading>
                <Text color="white">
                  Experience easy scheduling for a simple ask from us? Give us
                  feedback on your experience.
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ProAccessPopUp
