import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useRef } from 'react'

import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onCancel: () => Promise<void>
  isLoading: boolean
  expiryDate?: string
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  isLoading,
  expiryDate,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { showSuccessToast } = useToastHelpers()

  const handleCancel = async () => {
    try {
      await onCancel()
      showSuccessToast(
        'Subscription Cancelled',
        'Your subscription has been cancelled. You will retain access to Pro features until your current billing period ends.'
      )
      onClose()
    } catch (error) {
      handleApiError('Failed to cancel subscription', error)
    }
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      blockScrollOnMount={false}
      size="lg"
      isCentered
    >
      <AlertDialogOverlay bg="blackAlpha.900" />
      <AlertDialogContent
        bg="bg-surface"
        borderColor="border-default"
        borderWidth="1px"
      >
        <AlertDialogHeader
          fontSize="lg"
          fontWeight="bold"
          color="text-primary"
          pb={2}
        >
          Cancel Subscription
        </AlertDialogHeader>

        <AlertDialogBody>
          <VStack spacing={4} align="flex-start">
            <Text color="text-primary" fontSize="md">
              Are you sure you want to cancel your subscription?
            </Text>
            {expiryDate && (
              <Text color="text-secondary" fontSize="sm">
                You will still have access to all Pro features until{' '}
                <strong>{expiryDate}</strong>. After that date, your account
                will revert to the Free plan.
              </Text>
            )}
          </VStack>
        </AlertDialogBody>

        <AlertDialogFooter>
          <Button
            ref={cancelRef}
            onClick={onClose}
            isDisabled={isLoading}
            variant="outline"
            borderColor="border-default"
            color="text-primary"
            _hover={{ bg: 'bg-surface-tertiary' }}
          >
            Keep Subscription
          </Button>
          <Button
            colorScheme="red"
            onClick={handleCancel}
            ml={3}
            isLoading={isLoading}
            loadingText="Cancelling..."
            isDisabled={isLoading}
          >
            Cancel Subscription
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CancelSubscriptionModal
