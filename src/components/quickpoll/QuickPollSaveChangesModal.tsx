import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

interface QuickPollSaveChangesModalProps {
  isOpen: boolean
  removedCount: number
  isSaving?: boolean
  onDiscard: () => void
  onConfirm: () => void
}

const QuickPollSaveChangesModal: React.FC<QuickPollSaveChangesModalProps> = ({
  isOpen,
  removedCount,
  isSaving,
  onDiscard,
  onConfirm,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onDiscard} isCentered size="md">
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
        <ModalHeader pb={2}>
          <Heading fontSize="20px" fontWeight="600" color="text-primary">
            Save changes?
          </Heading>
        </ModalHeader>
        <ModalBody px={6} pb={6}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="14px" color="text-primary" lineHeight="1.5">
              You removed {removedCount} participant
              {removedCount === 1 ? '' : 's'}. Do you want to save these changes
              before leaving?
            </Text>
            <HStack justifyContent="flex-end" gap={3}>
              <Button
                variant="outline"
                colorScheme="primary"
                onClick={onDiscard}
              >
                Discard
              </Button>
              <Button
                bg="primary.200"
                color="neutral.900"
                _hover={{ bg: 'primary.300' }}
                _active={{ bg: 'primary.400' }}
                isLoading={isSaving}
                loadingText="Saving..."
                onClick={onConfirm}
              >
                Save and exit
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default QuickPollSaveChangesModal
