import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { HandleStatus } from '@/types/Billing'
import { SettingsSection } from '@/types/Dashboard'
import { getSubscriptionByDomain } from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'

interface CustomHandleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  currentAccountAddress: string
}

const CustomHandleSelectionModal: React.FC<CustomHandleSelectionModalProps> = ({
  isOpen,
  onClose,
  currentAccountAddress,
}) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState<HandleStatus>(HandleStatus.IDLE)
  const [debouncedHandle] = useDebounceValue(handle, 500)

  // Sanitize handle input
  const sanitizeHandle = (value: string): string => {
    return value
      .replace(/ /g, '')
      .replace(/[^\w.]/gi, '')
      .toLowerCase()
  }

  // Validate handle format
  const isValidFormat = (value: string): boolean => {
    if (!value || value.length < 3) return false
    if (value.length > 30) return false
    // Must start and end with alphanumeric
    if (!/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/.test(value)) return false
    // No consecutive dots
    if (/\.\./.test(value)) return false
    return true
  }

  const handleModalClose = () => {
    setHandle('')
    setStatus(HandleStatus.IDLE)
    onClose()
  }

  // Check availability when debounced handle changes
  useEffect(() => {
    if (!isOpen) return

    if (!debouncedHandle) {
      setStatus(HandleStatus.IDLE)
      return
    }

    if (!isValidFormat(debouncedHandle)) {
      setStatus(HandleStatus.INVALID)
      return
    }

    // Check availability
    const checkAvailability = async () => {
      setStatus(HandleStatus.CHECKING)

      try {
        const existing = await getSubscriptionByDomain(debouncedHandle)

        if (!existing) {
          setStatus(HandleStatus.AVAILABLE)
        } else if (
          existing.owner_account?.toLowerCase() ===
          currentAccountAddress.toLowerCase()
        ) {
          setStatus(HandleStatus.AVAILABLE)
        } else {
          setStatus(HandleStatus.TAKEN)
        }
      } catch {
        setStatus(HandleStatus.AVAILABLE)
      }
    }

    void checkAvailability()
  }, [debouncedHandle, isOpen, currentAccountAddress])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeHandle(e.target.value)
    setHandle(sanitized)
  }

  const handleContinue = () => {
    if (status !== HandleStatus.AVAILABLE || !handle) return

    void router.push(
      `/dashboard/settings/${
        SettingsSection.SUBSCRIPTIONS
      }/billing?handle=${encodeURIComponent(handle)}`
    )
    handleModalClose()
  }

  const getStatusIcon = () => {
    switch (status) {
      case HandleStatus.CHECKING:
        return <Spinner size="sm" color="blue.500" />
      case HandleStatus.AVAILABLE:
        return <FaCheck color="green" />
      case HandleStatus.TAKEN:
      case HandleStatus.INVALID:
        return <FaTimes color="red" />
      default:
        return null
    }
  }

  const getHelperText = () => {
    switch (status) {
      case HandleStatus.CHECKING:
        return 'Checking availability...'
      case HandleStatus.AVAILABLE:
        return (
          <>
            This handle is available! Your calendar page will be at{' '}
            <Text as="span" fontWeight="bold">
              {appUrl}/{handle}
            </Text>
          </>
        )
      case HandleStatus.TAKEN:
        return 'This handle is already taken. Please choose another.'
      case HandleStatus.INVALID:
        if (!handle) return 'Enter a handle to continue.'
        if (handle.length < 3) return 'Handle must be at least 3 characters.'
        if (handle.length > 30) return 'Handle must be 30 characters or less.'
        return 'Invalid format. Use only letters, numbers, and dots.'
      default:
        return (
          <>
            Choose a custom handle for your booking page. This is the link you
            will share with others instead of your wallet address. Your calendar
            will be available at{' '}
            <Text as="span" fontWeight="bold">
              {appUrl}/{handle || 'your.handle'}
            </Text>
          </>
        )
    }
  }

  const getHelperTextColor = () => {
    switch (status) {
      case HandleStatus.AVAILABLE:
        return 'green.400'
      case HandleStatus.TAKEN:
      case HandleStatus.INVALID:
        return 'red.400'
      default:
        return 'gray.400'
    }
  }

  const canContinue = status === HandleStatus.AVAILABLE && handle.length >= 3

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      initialFocusRef={inputRef}
      size="md"
      isCentered
    >
      <ModalOverlay />
      <ModalContent bg="neutral.900" color="neutral.200">
        <ModalHeader>Choose Your Handle</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <FormControl>
            <Text mb={2} fontSize="sm" color="gray.400">
              Your custom booking link
            </Text>
            <InputGroup>
              <InputLeftAddon
                bg="transparent"
                border="1px solid"
                borderColor="neutral.600"
                borderRightWidth={0}
                pr={0}
                fontSize="sm"
              >
                {appUrl}/
              </InputLeftAddon>
              <Input
                ref={inputRef}
                placeholder="your.handle"
                value={handle}
                onChange={handleInputChange}
                borderColor="neutral.600"
                borderLeftWidth={0}
                pl={0}
                _focusVisible={{
                  borderColor: 'neutral.500',
                  boxShadow: 'none',
                }}
                _placeholder={{
                  color: 'neutral.500',
                }}
              />
              <InputRightElement>
                <Box>{getStatusIcon()}</Box>
              </InputRightElement>
            </InputGroup>
            <FormHelperText color={getHelperTextColor()} mt={3} fontSize="sm">
              {getHelperText()}
            </FormHelperText>
          </FormControl>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button
            colorScheme="primary"
            onClick={handleContinue}
            isDisabled={!canContinue}
            isLoading={status === HandleStatus.CHECKING}
          >
            Continue to Payment
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default CustomHandleSelectionModal
