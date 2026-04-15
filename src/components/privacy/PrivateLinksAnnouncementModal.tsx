'use client'

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

import { getGoogleMeetAuthUrl, getZoomAuthUrl } from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

export interface PrivateLinksAnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PrivateLinksAnnouncementModal = ({
  isOpen,
  onClose,
}: PrivateLinksAnnouncementModalProps) => {
  const { showErrorToast } = useToastHelpers()
  const [connectGoogle, setConnectGoogle] = useState(false)
  const [connectZoom, setConnectZoom] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleContinue = async () => {
    if (!connectGoogle && !connectZoom) {
      onClose()
      return
    }

    setIsConnecting(true)
    try {
      if (connectGoogle && connectZoom) {
        const { url: zoomUrl } = await getZoomAuthUrl()
        const googleState = Buffer.from(
          JSON.stringify({
            redirectTo: zoomUrl,
            origin: 'announcement',
          })
        ).toString('base64')
        const { url: googleUrl } = await getGoogleMeetAuthUrl(googleState)

        window.open(googleUrl, '_self')
      } else if (connectGoogle) {
        const { url } = await getGoogleMeetAuthUrl()

        window.open(url, '_self')
      } else if (connectZoom) {
        const { url } = await getZoomAuthUrl()

        window.open(url, '_self')
      }
      onClose()
    } catch {
      setIsConnecting(false)
      showErrorToast(
        'Connection failed',
        'Could not connect your accounts. Please try again.'
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="xl"
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        borderRadius={{ base: 0, md: '12px' }}
        border="1px solid"
        borderColor="border-wallet-subtle"
        p={0}
        overflow="hidden"
        maxW="592px"
        width={{ base: '100%', md: '592px' }}
        boxShadow="none"
        shadow="none"
      >
        <ModalBody p={0}>
          <Box p={{ base: 6, md: 8 }}>
            <Text color="text-primary" fontWeight="bold" fontSize="2xl" mb={2}>
              Introducing Private Meeting links for Meet & Zoom
            </Text>

            <Text color="text-secondary" fontSize="sm" mb={6}>
              March 2025
            </Text>

            <VStack align="start" spacing={4} mb={8}>
              <Text color="text-primary" fontWeight="bold" fontSize="lg">
                Your meeting links are now private
              </Text>
              <Text color="text-primary" fontSize="md">
                Until now, every link Meetwith generated was public — anyone
                with it could walk straight in. That changes today.
              </Text>
              <Text color="text-primary" fontSize="md">
                Connect your Google Meet or Zoom account and every meeting you
                book through Meetwith automatically gets a private link. Invited
                guests join directly. Anyone else lands in a waiting room until
                you let them in.
              </Text>
              <Text color="text-primary" fontSize="md" fontWeight="medium">
                Connect your accounts below to activate it.
              </Text>
            </VStack>

            <Box
              borderTop="1px solid"
              borderColor="border-wallet-subtle"
              pt={6}
            >
              <VStack align="stretch" spacing={4}>
                <Flex align="center" gap={4}>
                  <Checkbox
                    colorScheme="primary"
                    isChecked={connectGoogle}
                    onChange={e => setConnectGoogle(e.target.checked)}
                    size="lg"
                  />
                  <Flex align="center" gap={3}>
                    <Image
                      src="/assets/connected-accounts/google-meet.png"
                      w="24px"
                      h="24px"
                      alt="Google Meet"
                    />
                    <Text color="text-primary" fontSize="md">
                      Connect your Google Meet Account
                    </Text>
                  </Flex>
                </Flex>

                <Flex align="center" gap={4}>
                  <Checkbox
                    colorScheme="primary"
                    isChecked={connectZoom}
                    onChange={e => setConnectZoom(e.target.checked)}
                    size="lg"
                  />
                  <Flex align="center" gap={3}>
                    <Image
                      src="/assets/connected-accounts/zoom.png"
                      w="24px"
                      h="24px"
                      alt="Zoom"
                    />
                    <Text color="text-primary" fontSize="md">
                      Connect your Zoom Account
                    </Text>
                  </Flex>
                </Flex>
              </VStack>
            </Box>
          </Box>

          <Box
            bg="bg-surface-secondary"
            p={{ base: 4, md: 6 }}
            borderTop="1px solid"
            borderColor="border-wallet-subtle"
            display="flex"
            justifyContent="flex-end"
          >
            <Button
              bg="primary.400"
              color="white"
              _hover={{ bg: 'primary.500' }}
              transition="background 0.2s ease"
              borderRadius="8px"
              fontSize="16px"
              px={6}
              py={3}
              rightIcon={<FiArrowRight />}
              onClick={handleContinue}
              isLoading={isConnecting}
              loadingText="Connecting"
              width={{ base: '100%', md: 'auto' }}
            >
              Continue
            </Button>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
