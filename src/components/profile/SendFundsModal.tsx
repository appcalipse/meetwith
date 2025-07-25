import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { IoChevronDown } from 'react-icons/io5'

interface SendFundsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Token {
  name: string
  symbol: string
  icon: string
  address: string
  chain: string
}

const SendFundsModal: React.FC<SendFundsModalProps> = ({ isOpen, onClose }) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)

  const tokens: Token[] = [
    {
      name: 'Tether USD',
      symbol: 'USDT',
      icon: '/assets/tokens/USDT.svg',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'Arbitrum',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      icon: '/assets/tokens/USDC.svg',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'Arbitrum',
    },
    {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '/assets/tokens/CUSD.png',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'Celo',
    },
  ]

  const handleSend = () => {
    // TODO: Implement actual sending logic with Thirdweb
    onClose()
  }

  return (
    <>
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
                Send funds
              </Text>
            </HStack>
          </ModalHeader>

          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              {/* Select Token */}
              <Box>
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Select token
                </Text>
                <Box
                  bg="neutral.825"
                  borderRadius="12px"
                  px={4}
                  py={3}
                  display="flex"
                  alignItems="center"
                  gap={3}
                  cursor="pointer"
                  onClick={() => setIsTokenModalOpen(true)}
                  _hover={{ opacity: 0.8 }}
                  border="1px solid"
                  borderColor="neutral.700"
                >
                  {selectedToken ? (
                    <>
                      <Image
                        src={selectedToken.icon}
                        alt={selectedToken.symbol}
                        w="24px"
                        h="24px"
                        borderRadius="full"
                      />
                      <Text color="white" fontSize="16px" fontWeight="500">
                        {selectedToken.symbol}
                      </Text>
                    </>
                  ) : (
                    <Text color="neutral.400" fontSize="16px">
                      Select a token
                    </Text>
                  )}
                  <Icon
                    as={IoChevronDown}
                    color="neutral.300"
                    fontSize="16px"
                    ml="auto"
                  />
                </Box>
              </Box>

              {/* Recipient Address */}
              <Box>
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Receive (enter wallet address)
                </Text>
                <Input
                  placeholder="Enter the receivers wallet address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius="12px"
                  color="white"
                  fontSize="16px"
                  _placeholder={{ color: 'neutral.400' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                />
              </Box>

              {/* Warning Message */}
              <Box
                bg="orange.900"
                borderRadius="8px"
                px={4}
                py={3}
                border="1px solid"
                borderColor="orange.700"
              >
                <Text color="orange.200" fontSize="14px" fontWeight="500">
                  Ensure you&apos;re sending the funds to an{' '}
                  <Text as="span" color="orange.100" fontWeight="700">
                    Arbitrum
                  </Text>{' '}
                  network wallet address to avoid loss of funds.
                </Text>
              </Box>

              {/* Amount */}
              <Box>
                <Text color="white" fontSize="16px" fontWeight="600" mb={3}>
                  Amount
                </Text>
                <Input
                  placeholder="Enter amount to send"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  bg="neutral.825"
                  border="1px solid"
                  borderColor="neutral.700"
                  borderRadius="12px"
                  color="white"
                  fontSize="16px"
                  _placeholder={{ color: 'neutral.400' }}
                  _focus={{
                    borderColor: 'primary.400',
                    boxShadow: 'none',
                  }}
                />
              </Box>

              {/* Send Button */}
              <Button
                bg="primary.500"
                color="white"
                fontSize="16px"
                fontWeight="600"
                py={4}
                borderRadius="12px"
                _hover={{ bg: 'primary.600' }}
                _active={{ bg: 'primary.700' }}
                onClick={handleSend}
                isDisabled={!selectedToken || !recipientAddress || !amount}
              >
                Send
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Token Selection Modal */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="neutral.850"
          borderRadius="12px"
          border="1px solid"
          borderColor="neutral.800"
        >
          <ModalHeader color="white" fontSize="20px" fontWeight="600" pb={2}>
            Select Token
          </ModalHeader>
          <ModalBody pb={6}>
            <RadioGroup
              value={selectedToken?.symbol || ''}
              onChange={value => {
                const token = tokens.find(t => t.symbol === value)
                setSelectedToken(token || null)
                setIsTokenModalOpen(false)
              }}
            >
              <Stack spacing={4}>
                {tokens.map(token => (
                  <Radio
                    key={token.symbol}
                    value={token.symbol}
                    colorScheme="orange"
                    size="lg"
                    variant="filled"
                  >
                    <HStack spacing={3}>
                      <Image
                        src={token.icon}
                        alt={token.symbol}
                        w="24px"
                        h="24px"
                        borderRadius="full"
                      />
                      <VStack align="start" spacing={0}>
                        <Text color="white" fontSize="16px" fontWeight="500">
                          {token.name}
                        </Text>
                        <Text color="neutral.400" fontSize="14px">
                          {token.chain}
                        </Text>
                      </VStack>
                    </HStack>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default SendFundsModal
