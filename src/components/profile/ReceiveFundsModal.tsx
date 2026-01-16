import {
  Box,
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import QRCode from 'qrcode'
import React, { useEffect, useState } from 'react'
import { FiArrowLeft, FiCopy, FiDownload } from 'react-icons/fi'

import useAccountContext from '@/hooks/useAccountContext'
import { useToastHelpers } from '@/utils/toasts'

interface ReceiveFundsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentAccount = useAccountContext()
  const [_copied, setCopied] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  const walletAddress = currentAccount?.address || ''

  // Generate QR code when modal opens or wallet address changes
  useEffect(() => {
    if (isOpen && walletAddress) {
      generateQRCode()
    }
  }, [isOpen, walletAddress])

  const generateQRCode = async () => {
    if (!walletAddress) return

    setIsGeneratingQR(true)
    try {
      const qrDataUrl = await QRCode.toDataURL(walletAddress, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      setQrCodeDataUrl(qrDataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      showErrorToast('QR Code Error', 'Failed to generate QR code')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a')
      link.href = qrCodeDataUrl
      link.download = `wallet-qr-${walletAddress.slice(0, 8)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showSuccessToast('QR Code Downloaded', 'QR code saved to your device')
    }
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      showSuccessToast('Address copied!', 'Wallet address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = walletAddress
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      showSuccessToast('Address copied!', 'Wallet address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'md' }}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        borderRadius={{ base: '0', md: '12px' }}
        border="1px solid"
        borderColor="border-wallet-subtle"
        maxW={{ base: '100%', md: '500px' }}
        mx={{ base: 0, md: 'auto' }}
        my={{ base: 0, md: 'auto' }}
        boxShadow="none"
      >
        {/* Header */}
        <ModalHeader pb={{ base: 3, md: 4 }}>
          <HStack spacing={2} align="center">
            <Icon
              as={FiArrowLeft}
              color="primary.400"
              fontSize={{ base: '18px', md: '20px' }}
              cursor="pointer"
              onClick={onClose}
              _hover={{ color: 'primary.300' }}
            />
            <Text
              color="text-primary"
              fontSize={{ base: '18px', md: '20px' }}
              fontWeight="600"
            >
              Receive funds
            </Text>
          </HStack>
        </ModalHeader>

        <ModalBody pb={{ base: 4, md: 6 }} px={{ base: 2, md: 6 }}>
          <VStack spacing={{ base: 4, md: 6 }} align="center">
            {/* Network Indicator */}
            <Box textAlign="center" mb={2}>
              <Text
                color="text-secondary"
                fontSize={{ base: '12px', md: '14px' }}
                fontWeight="500"
              >
                Receive funds on any EVM network
              </Text>
            </Box>

            {/* QR Code */}
            <Box
              w={{ base: '160px', md: '200px' }}
              h={{ base: '160px', md: '200px' }}
              bg="white"
              borderRadius={{ base: '8px', md: '12px' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={{ base: 3, md: 4 }}
              position="relative"
            >
              {isGeneratingQR ? (
                <Box
                  w="100%"
                  h="100%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    color="text-secondary"
                    fontSize="12px"
                    textAlign="center"
                  >
                    Generating QR Code...
                  </Text>
                </Box>
              ) : qrCodeDataUrl ? (
                <Box
                  as="img"
                  src={qrCodeDataUrl}
                  alt="Wallet QR Code"
                  w="100%"
                  h="100%"
                  objectFit="contain"
                />
              ) : (
                <Box
                  w="100%"
                  h="100%"
                  bg="bg-surface-tertiary-2"
                  borderRadius="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    color="text-secondary"
                    fontSize="12px"
                    textAlign="center"
                  >
                    No QR Code Available
                  </Text>
                </Box>
              )}
            </Box>

            {/* QR Code Actions */}
            <HStack spacing={3} w="100%" justify="center">
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                leftIcon={<FiDownload />}
                onClick={handleDownloadQR}
                isDisabled={!qrCodeDataUrl}
                _hover={{ bg: 'blue.600', color: 'white' }}
              >
                Download QR
              </Button>
            </HStack>

            {/* Wallet Address */}
            <Box w="100%">
              <Box
                bg="transparent"
                borderRadius="8px"
                px={{ base: 3, md: 4 }}
                py={{ base: 2, md: 3 }}
                display="flex"
                alignItems="center"
                gap={3}
                border="1px solid"
                borderColor="border-default"
              >
                <Text
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="500"
                  flex="1"
                >
                  {walletAddress || 'No wallet address available'}
                </Text>
                <Icon
                  as={FiCopy}
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  cursor="pointer"
                  _hover={{ opacity: 0.8 }}
                  onClick={handleCopyAddress}
                />
              </Box>
            </Box>

            {/* Instructional Text */}
            <VStack spacing={2} align="center" textAlign="center">
              <Text
                color="text-primary"
                fontSize={{ base: '12px', md: '14px' }}
              >
                Copy the address to send funds to this wallet.
              </Text>
              <Text
                color="primary.400"
                fontSize={{ base: '12px', md: '14px' }}
                fontWeight="500"
              >
                This is an EVM wallet, only send EVM compatible assets to this
                address.
              </Text>
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ReceiveFundsModal
