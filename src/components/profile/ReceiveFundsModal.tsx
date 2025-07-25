import {
  Box,
  Button,
  Flex,
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
import React, { useState } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { FiCopy } from 'react-icons/fi'

import useAccountContext from '@/hooks/useAccountContext'

interface ReceiveFundsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentAccount = useAccountContext()
  const [copied, setCopied] = useState(false)

  // Mock wallet address - in real implementation, this would come from the user's wallet
  const walletAddress = currentAccount?.address || '0x4A9Ea...A9Ea'

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = walletAddress
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="neutral.900"
        borderRadius="12px"
        border="1px solid"
        borderColor="neutral.825"
        maxW="500px"
      >
        {/* Header */}
        <ModalHeader pb={4}>
          <HStack spacing={2} align="center">
            <Icon
              as={FiArrowLeft}
              color="primary.400"
              fontSize="20px"
              cursor="pointer"
              onClick={onClose}
              _hover={{ color: 'primary.300' }}
            />
            <Text color="white" fontSize="20px" fontWeight="600">
              Receive funds
            </Text>
          </HStack>
        </ModalHeader>

        <ModalBody pb={6}>
          <VStack spacing={6} align="center">
            {/* QR Code */}
            <Box
              w="200px"
              h="200px"
              bg="white"
              borderRadius="12px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={4}
            >
              {/* Mock QR Code - in real implementation, this would be generated from the wallet address */}
              <Box
                w="100%"
                h="100%"
                bg="gray.200"
                borderRadius="8px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.600" fontSize="12px" textAlign="center">
                  QR Code
                  <br />
                  (Mock)
                </Text>
              </Box>
            </Box>

            {/* Wallet Address */}
            <VStack spacing={3} align="center">
              <Text color="white" fontSize="16px" fontWeight="600">
                {walletAddress}
              </Text>
              <Button
                leftIcon={<Icon as={FiCopy} />}
                variant="ghost"
                color="primary.400"
                fontSize="14px"
                fontWeight="500"
                _hover={{ bg: 'transparent', color: 'primary.300' }}
                onClick={handleCopyAddress}
              >
                {copied ? 'Copied!' : 'Copy address'}
              </Button>
            </VStack>

            {/* Instructional Text */}
            <VStack spacing={2} align="center" textAlign="center">
              <Text color="neutral.300" fontSize="16px" fontWeight="500">
                Copy the address to send funds to this wallet.
              </Text>
              <Text color="orange.200" fontSize="16px" fontWeight="500">
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
