import {
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FaArrowLeft } from 'react-icons/fa'

interface MagicLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmButtonText: string
  isLoading?: boolean
}

const MagicLinkModal: React.FC<MagicLinkModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  isLoading = false,
}) => {
  const textColor = useColorModeValue('gray.900', 'white')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const primaryColor = '#F46739'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'md' }}
      isCentered
    >
      <ModalOverlay bg="#131A20CC" backdropFilter="blur(12px)" />
      <ModalContent
        bg="dark.700"
        borderRadius={{ base: '0', md: '12px' }}
        p={{ base: 6, md: 8 }}
        maxW={{ base: '100%', md: '592px' }}
        width={{ base: '100%', md: '592px' }}
        mx={{ base: 0, md: 'auto' }}
        my={{ base: 0, md: 'auto' }}
        boxShadow="none"
      >
        <ModalBody p={0}>
          <VStack spacing={6} align="stretch">
            {/* Header with back button */}
            <Box mb={2}>
              <Button
                variant="ghost"
                p={0}
                minW="auto"
                onClick={onClose}
                _hover={{ bg: 'transparent' }}
                leftIcon={<FaArrowLeft color={primaryColor} size={20} />}
                color="primary.400"
                fontWeight="medium"
                fontSize="sm"
              >
                Back
              </Button>
            </Box>

            {/* Title and message */}
            <VStack align="flex-start" spacing={3}>
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                {title}
              </Text>
              <Text fontSize="md" color={mutedColor} lineHeight="1.6">
                {message}
              </Text>
            </VStack>

            {/* Action buttons */}
            <HStack spacing={4} pt={4} justifyContent="space-between" pb={10}>
              <Button
                bg="primary.300"
                color="dark.800"
                _hover={{ bg: 'primary.400' }}
                onClick={onConfirm}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
                isLoading={isLoading}
                loadingText="Sending..."
                isDisabled={isLoading}
              >
                {confirmButtonText}
              </Button>
              <Button
                variant="outline"
                border="1px solid"
                bg="neutral.825"
                borderColor="primary.300"
                color="primary.300"
                onClick={onClose}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default MagicLinkModal
