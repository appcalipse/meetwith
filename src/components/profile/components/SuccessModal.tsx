import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  useColorModeValue,
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
  const textColor = useColorModeValue('gray.900', 'white')

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
        bg="dark.700"
        borderRadius="12px"
        p={8}
        maxW="592px"
        width="592px"
        boxShadow="none"
      >
        <ModalBody p={0}>
          <VStack spacing={6} align="stretch" textAlign="center">
            {/* Title */}
            <Text fontSize="2xl" fontWeight="bold" color={textColor}>
              {title}
            </Text>

            {/* Message */}
            <Text fontSize="md" color={textColor}>
              {message}
            </Text>

            {/* Action button */}
            <Box pt={4} pb={10}>
              <Button
                bg="primary.300"
                color="dark.800"
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
