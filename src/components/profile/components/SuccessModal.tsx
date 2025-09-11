import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  buttonText?: string
  onButtonClick?: () => void
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'Go back to Dashboard',
  onButtonClick,
}) => {
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="#131A20CC" backdropFilter="blur(12px)" />
      <ModalContent
        bg="dark-bg"
        borderRadius="12px"
        p={8}
        maxW="592px"
        width="592px"
        boxShadow="none"
        shadow="none"
      >
        <ModalBody p={0}>
          <VStack spacing={6} align="stretch" textAlign="center">
            {/* Title */}
            <Text fontSize="2xl" fontWeight="bold" color="text-primary">
              {title}
            </Text>

            {/* Message */}
            <Text fontSize="md" color="text-primary">
              {message}
            </Text>

            {/* Action button */}
            <Box pt={4} pb={10}>
              <Button
                bg="primary.300"
                color="text-primary"
                _hover={{ bg: 'primary.400' }}
                onClick={handleButtonClick}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
              >
                {buttonText}
              </Button>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default SuccessModal
