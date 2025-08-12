import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'

import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { Account } from '@/types/Account'
import { SupportedChain } from '@/types/chains'
import { networkOptions as paymentNetworkOptions } from '@/utils/constants/meeting-types'

import Block from './components/Block'

const WalletAndPayment: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChain | ''>(
    ''
  )
  const [sendFundsNotification, setSendFundsNotification] = useState(true)
  const [receiveFundsNotification, setReceiveFundsNotification] =
    useState(false)

  // Initialize selected network from environment-aware supported payment chains
  useEffect(() => {
    if (!selectedNetwork && paymentNetworkOptions.length > 0) {
      setSelectedNetwork(paymentNetworkOptions[0].value)
    }
  }, [selectedNetwork])

  const selected = paymentNetworkOptions.find(n => n.value === selectedNetwork)

  const handleEnablePin = () => {
    onOpen()
  }

  const handlePinCreated = (pin: string) => {
    // TODO: Implement PIN storage logic
    // console.log('PIN created:', pin)
    onClose()
  }

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Heading fontSize="2xl">Wallet & Payments</Heading>

      {/* Wallet Section */}
      <Block>
        {/* Wallet */}
        <Heading fontSize="xl" mb={4}>
          Wallet
        </Heading>

        <VStack align="stretch" spacing={4}>
          <Box mt={2}>
            <Text fontSize="md" fontWeight="medium" mb={3} color="neutral.0">
              Enable Transaction Pin
            </Text>
            <Button
              onClick={handleEnablePin}
              bg="primary.200"
              color="dark.800"
              _hover={{ bg: 'primary.300' }}
              size="md"
              px={6}
            >
              Enable Pin
            </Button>
          </Box>
        </VStack>

        {/* Payment settings */}
        <Box mt={10}>
          <Heading fontSize="xl" mb={4}>
            Payment settings
          </Heading>

          <FormControl>
            <FormLabel fontSize="md" color="neutral.0">
              Network to receive payment
            </FormLabel>

            {/* Custom dropdown with chain icons, environment-aware options */}
            <Menu matchWidth>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="outline"
                borderColor="neutral.825"
                bg="neutral.900"
                height="44px"
                width="390px"
                _hover={{ bg: 'neutral.900', borderColor: 'neutral.700' }}
                _active={{ bg: 'neutral.900' }}
                justifyContent="flex-start"
                px={4}
              >
                <HStack spacing={3}>
                  <Box
                    w="20px"
                    h="20px"
                    borderRadius="full"
                    overflow="hidden"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {selected?.icon ? (
                      <Image
                        src={selected.icon}
                        alt={selected.name}
                        w="100%"
                        h="100%"
                      />
                    ) : null}
                  </Box>
                  <Text fontWeight="600" color="white">
                    {selected?.name || 'Select network'}
                  </Text>
                </HStack>
              </MenuButton>
              <MenuList bg="neutral.850" borderColor="neutral.800">
                {paymentNetworkOptions.map(option => (
                  <MenuItem
                    key={option.value}
                    onClick={() => setSelectedNetwork(option.value)}
                    bg="neutral.850"
                    _hover={{ bg: 'neutral.800' }}
                  >
                    <HStack spacing={3}>
                      <Box
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        overflow="hidden"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Image
                          src={option.icon}
                          alt={option.name}
                          w="100%"
                          h="100%"
                        />
                      </Box>
                      <Text color="white">{option.name}</Text>
                    </HStack>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </FormControl>
        </Box>

        {/* Payment & Wallet notifications */}
        <Box mt={10}>
          <Heading fontSize="xl" mb={2}>
            Payment & Wallet notifications
          </Heading>

          <Text fontSize="md" fontWeight="500" mb={4} color="neutral.0">
            Notifications
          </Text>

          <VStack align="stretch" spacing={3}>
            <Checkbox
              isChecked={sendFundsNotification}
              onChange={e => setSendFundsNotification(e.target.checked)}
              size="lg"
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'neutral.600',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'neutral.0',
                  fontSize: 'md',
                },
              }}
            >
              Send funds notification
            </Checkbox>

            <Checkbox
              isChecked={receiveFundsNotification}
              onChange={e => setReceiveFundsNotification(e.target.checked)}
              size="lg"
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'neutral.600',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'neutral.0',
                  fontSize: 'md',
                },
              }}
            >
              Receive funds notification
            </Checkbox>
          </VStack>
        </Box>
      </Block>

      {/* Transaction PIN Modal */}
      <TransactionPinModal
        isOpen={isOpen}
        onClose={onClose}
        onPinCreated={handlePinCreated}
      />
    </VStack>
  )
}

export default WalletAndPayment
