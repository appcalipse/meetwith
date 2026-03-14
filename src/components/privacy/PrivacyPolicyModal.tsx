'use client'

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useContext, useEffect, useRef, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

import { AccountContext } from '@/providers/AccountProvider'
import { acceptTerms } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { ApiFetchError } from '@/utils/errors'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'
import { isValidEmail } from '@/utils/validations'

import { PrivacyPolicyContent } from './PrivacyPolicyContent'

const isEmailRequiredError = (e: unknown): boolean => {
  if (e instanceof ApiFetchError && e.status === 400) {
    try {
      const body = JSON.parse(e.message) as { code?: string }
      return body?.code === 'EMAIL_REQUIRED'
    } catch {
      return false
    }
  }
  return false
}

export interface PrivacyPolicyModalProps {
  isOpen: boolean
  onAccepted?: () => void
}

const PrivacyPolicyModal = ({
  isOpen,
  onAccepted,
}: PrivacyPolicyModalProps) => {
  const { showSuccessToast } = useToastHelpers()
  const { currentAccount, login } = useContext(AccountContext)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
  const [productUpdates, setProductUpdates] = useState(true)
  const [tipsAndEducation, setTipsAndEducation] = useState(true)
  const [researchAndFeedbackRequests, setResearchAndFeedbackRequests] =
    useState(true)
  const [showEmailSection, setShowEmailSection] = useState(false)
  const [email, setEmail] = useState('')

  const canAgree = hasScrolledToEnd

  useEffect(() => {
    if (!isOpen) return

    setHasScrolledToEnd(false)

    let observer: IntersectionObserver | null = null
    let frameId = 0

    const attachObserver = () => {
      const root = scrollRef.current
      const sentinel = sentinelRef.current

      if (!root || !sentinel) {
        frameId = window.requestAnimationFrame(attachObserver)
        return
      }

      const markIfScrolledToBottom = () => {
        const nearBottom =
          root.scrollTop + root.clientHeight >= root.scrollHeight - 2
        if (nearBottom) setHasScrolledToEnd(true)
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setHasScrolledToEnd(true)
        },
        { root, rootMargin: '0px', threshold: 0 }
      )

      observer.observe(sentinel)
      root.addEventListener('scroll', markIfScrolledToBottom, { passive: true })
      markIfScrolledToBottom()

      return () => root.removeEventListener('scroll', markIfScrolledToBottom)
    }

    const cleanupScrollListener = attachObserver()

    return () => {
      window.cancelAnimationFrame(frameId)
      observer?.disconnect()
      cleanupScrollListener?.()
    }
  }, [isOpen])

  const mutation = useMutation({
    mutationFn: ({
      accepted,
      email: emailArg,
      segments,
    }: {
      accepted: boolean
      email?: string
      segments?: {
        productUpdates: boolean
        tipsAndEducation: boolean
        researchAndFeedbackRequests: boolean
      }
    }) => acceptTerms(accepted, emailArg, segments),
    onSuccess: async (_data, variables) => {
      showSuccessToast(
        'Preferences saved',
        "You're all set. We've recorded your choices and added you to our updates."
      )

      if (currentAccount) {
        login({
          ...currentAccount,
          preferences: {
            ...currentAccount.preferences!,
            terms_accepted: variables.accepted,
          },
        })
      }

      queryClient.invalidateQueries(
        QueryKeys.account(currentAccount?.address?.toLowerCase())
      )

      if (onAccepted) onAccepted()
    },
    onError: (e: unknown) => {
      if (isEmailRequiredError(e)) {
        setShowEmailSection(true)
        return
      }
      handleApiError('Unable to save preferences', e)
    },
  })

  const segments = {
    productUpdates,
    tipsAndEducation,
    researchAndFeedbackRequests,
  }

  const handleDecline = () => {
    mutation.mutate({ accepted: false })
  }

  const handleAgree = () => {
    if (!canAgree || mutation.isLoading) return
    mutation.mutate({ accepted: true, segments })
  }

  const handleSubscribe = () => {
    const trimmed = email.trim()
    if (!trimmed || !isValidEmail(trimmed) || mutation.isLoading) return
    mutation.mutate({ accepted: true, email: trimmed, segments })
  }

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email.trim())

  if (!isOpen) return null

  return (
    <Modal isOpen onClose={() => {}} isCentered size="xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        border="1px solid"
        borderRadius={{ base: 0, md: 12 }}
        borderColor="border-wallet-subtle"
        minHeight={{ base: '100%', md: '21rem' }}
        maxHeight={{ base: '100%', md: '90vh' }}
        minWidth={{ base: '100%', md: '600px' }}
        maxWidth={{ base: '100%', md: '720px' }}
        overflow="hidden"
        margin={{ base: 0, md: 4 }}
        shadow="none"
        boxShadow="none"
      >
        <ModalHeader
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          borderBottom="1px solid"
          borderColor="border-wallet-subtle"
          bg="bg-surface"
          py={4}
          px={{ base: 4, md: 6 }}
        >
          <Text color="text-primary" fontWeight={700} fontSize="xl">
            Updated Privacy Policy
          </Text>
          <Button
            size="sm"
            bg="red.250"
            color="white"
            _hover={{ bg: 'red.300' }}
            variant="solid"
            onClick={handleDecline}
            isDisabled={mutation.isLoading}
          >
            Decline
          </Button>
        </ModalHeader>

        <ModalBody
          p={0}
          display="flex"
          flexDir="column"
          overflow="hidden"
          bg="bg-surface"
        >
          <Box
            ref={scrollRef}
            flex="1"
            overflowY="auto"
            px={{ base: 4, md: 6 }}
            pb={4}
            sx={{
              scrollbarGutter: 'stable both-edges',
              '&::-webkit-scrollbar': {
                width: '6px',
                background: 'transparent',
              },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: 'transparent',
                borderRadius: '3px',
              },
              '&:hover::-webkit-scrollbar-thumb': {
                background: 'bg-surface-tertiary',
              },
            }}
          >
            <PrivacyPolicyContent />

            <VStack align="stretch" spacing={6} pt={2} pb={4}>
              <Checkbox
                colorScheme="orange"
                isChecked={productUpdates}
                onChange={e => setProductUpdates(e.target.checked)}
                color="text-primary"
              >
                <Text color="text-primary" fontSize="sm">
                  Product updates and announcements
                </Text>
              </Checkbox>
              <Checkbox
                colorScheme="orange"
                isChecked={tipsAndEducation}
                onChange={e => setTipsAndEducation(e.target.checked)}
                color="text-primary"
              >
                <Text color="text-primary" fontSize="sm">
                  Tips and educational content
                </Text>
              </Checkbox>
              <Checkbox
                colorScheme="orange"
                isChecked={researchAndFeedbackRequests}
                onChange={e => setResearchAndFeedbackRequests(e.target.checked)}
                color="text-primary"
              >
                <Text color="text-primary" fontSize="sm">
                  Research and feedback requests
                </Text>
              </Checkbox>
            </VStack>

            {showEmailSection && (
              <Box pt={4} pb={4}>
                <Text
                  color="text-primary"
                  fontWeight={600}
                  fontSize="sm"
                  mb={2}
                >
                  Provide your email to complete action
                </Text>
                <Flex
                  gap={3}
                  align="center"
                  flexDirection={{ base: 'column', md: 'row' }}
                  alignSelf="stretch"
                >
                  <Input
                    placeholder="Enter your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    bg="bg-surface-secondary"
                    borderColor={
                      emailInvalid ? 'red.400' : 'border-wallet-subtle'
                    }
                    color="text-primary"
                    _placeholder={{
                      color: 'text-tertiary',
                      fontSize: { base: '14px', md: '15px' },
                    }}
                    size="md"
                    w={{ base: 'full', md: '42.5%' }}
                    isInvalid={emailInvalid}
                    type="email"
                  />
                  <Button
                    bg="primary.400"
                    color="white"
                    _hover={{ bg: 'primary.500' }}
                    rightIcon={<FiArrowRight />}
                    onClick={handleSubscribe}
                    isLoading={mutation.isLoading}
                    isDisabled={
                      !email.trim() || emailInvalid || mutation.isLoading
                    }
                    transition="background 0.2s ease"
                    w={{ base: 'full', md: 'auto' }}
                    fontSize={{ base: '14px', md: '16px' }}
                  >
                    Subscribe to updates
                  </Button>
                </Flex>
              </Box>
            )}
            <Box ref={sentinelRef} aria-hidden="true" h="1px" />
          </Box>

          {!showEmailSection && (
            <Box
              px={{ base: 4, md: 6 }}
              py={4}
              borderTop="1px solid"
              borderColor="border-wallet-subtle"
              bg="bg-surface"
              display="flex"
              justifyContent={{ base: 'stretch', md: 'flex-start' }}
            >
              <Button
                w={{ base: 'full', md: 'auto' }}
                rightIcon={<FiArrowRight />}
                onClick={handleAgree}
                isLoading={mutation.isLoading}
                isDisabled={!canAgree || mutation.isLoading}
                bg={canAgree ? 'primary.400' : 'bg-surface-tertiary'}
                color="white"
                _hover={canAgree ? { bg: 'primary.500' } : undefined}
                transition="background 0.25s ease, opacity 0.25s ease"
                fontSize={{ base: '14px', md: '16px' }}
              >
                Agree and Continue
              </Button>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default PrivacyPolicyModal
