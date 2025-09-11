import {
  Button,
  HStack,
  Icon,
  Image,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FiArrowLeft } from 'react-icons/fi'

import { getSupportedChainFromId } from '@/types/chains'

interface TransactionSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  transactionHash: string
  amount: string
  token: string
  recipient: string
  chainId: number
}

const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  transactionHash,
  amount,
  token,
  recipient,
  chainId,
}) => {
  const handleViewInExplorer = () => {
    const chainInfo = getSupportedChainFromId(chainId)
    if (chainInfo?.blockExplorerUrl) {
      return `${chainInfo.blockExplorerUrl}/tx/${transactionHash}`
    }
    return '#'
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
        shadow="none"
        minH="425px"
      >
        <ModalBody p={{ base: 6, md: 8 }}>
          <VStack spacing={0} align="flex-start" textAlign="center">
            {/* Back Button */}
            <HStack
              spacing={2}
              align="center"
              cursor="pointer"
              onClick={onClose}
              color="primary.400"
              _hover={{ color: 'primary.300' }}
              mb={4}
            >
              <Icon as={FiArrowLeft} fontSize="20px" />
              <Text fontSize="16px" fontWeight="600">
                Back
              </Text>
            </HStack>

            {/* Success Icon */}
            <Image
              src="/assets/successful.svg"
              alt="Success"
              borderRadius="full"
              mt={2}
            />

            {/* Success Title */}
            <Text
              fontSize="24px"
              fontWeight="700"
              color="text-primary"
              mb={2}
              mt={4}
            >
              Transaction successful
            </Text>

            {/* Transaction Details */}
            <Text
              fontSize="16px"
              color="text-primary"
              fontWeight="500"
              lineHeight="1.4"
              mt={1}
              alignSelf="flex-start"
              textAlign="left"
            >
              You have successfully sent {amount} {token} to{' '}
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </Text>

            {/* View in Explorer Button */}
            <Link
              href={handleViewInExplorer()}
              isExternal
              _hover={{ textDecoration: 'none' }}
              _focus={{ boxShadow: 'none' }}
            >
              <Button
                bg="transparent"
                border="2px solid"
                borderColor="primary.200"
                color="primary.200"
                fontSize={{ base: '14px', md: '16px' }}
                fontWeight="700"
                py={{ base: 3, md: 5 }}
                px={4}
                borderRadius="8px"
                mt={8}
              >
                View transaction in explorer
              </Button>
            </Link>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default TransactionSuccessModal
