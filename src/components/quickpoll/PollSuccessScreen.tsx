import {
  Box,
  Button,
  Heading,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

interface PollSuccessScreenProps {
  isOpen: boolean
  onClose: () => void
  pollTitle?: string
  isProfileUpdateOnly?: boolean
}

const PollSuccessScreen: React.FC<PollSuccessScreenProps> = ({
  isOpen,
  onClose,
  pollTitle,
  isProfileUpdateOnly = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isCentered
      size="md"
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        border="1px solid"
        borderColor="card-border"
        borderRadius="12px"
        mx={4}
        shadow="none"
        boxShadow="none"
      >
        <ModalBody px={8} py={12}>
          <VStack spacing={6} align="center">
            <Image
              src="/assets/calendar_success.svg"
              alt="Success"
              width="50%"
              height="auto"
            />

            <VStack spacing={2} align="center">
              <Heading
                fontSize="24px"
                fontWeight="700"
                color="text-primary"
                textAlign="center"
              >
                {isProfileUpdateOnly
                  ? 'Profile Updated!'
                  : 'Availability Saved!'}
              </Heading>

              <Text
                fontSize="16px"
                color="text-secondary"
                textAlign="left"
                lineHeight="1.5"
              >
                {isProfileUpdateOnly ? (
                  <>
                    Your profile details for{' '}
                    <Text as="span" color="text-primary" fontWeight="600">
                      {pollTitle || 'this poll'}
                    </Text>{' '}
                    have been updated successfully.
                  </>
                ) : (
                  <>
                    Your availability for{' '}
                    <Text as="span" color="text-primary" fontWeight="600">
                      {pollTitle || 'this poll'}
                    </Text>{' '}
                    has been saved successfully.
                  </>
                )}
              </Text>
            </VStack>

            {!isProfileUpdateOnly && (
              <Box bg="bg-surface" borderRadius="8px" w="full">
                <Text
                  fontSize="16px"
                  color="text-secondary"
                  textAlign="left"
                  lineHeight="1.5"
                >
                  The host will review everyone&apos;s availability and schedule
                  the meeting. You&apos;ll receive an email notification with
                  the final meeting details.
                </Text>
              </Box>
            )}

            <Button
              onClick={onClose}
              bg="primary.200"
              color="button-text-dark"
              fontSize="16px"
              fontWeight="600"
              height="48px"
              borderRadius="8px"
              px={8}
              _hover={{ bg: 'primary.300' }}
              _active={{ bg: 'primary.400' }}
            >
              Done
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default PollSuccessScreen
