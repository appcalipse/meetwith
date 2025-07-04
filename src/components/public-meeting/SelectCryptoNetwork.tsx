import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
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
  VStack,
} from '@chakra-ui/react'
import { AcceptedToken, getTokenIcon, supportedChains } from '@meta/chains'
import {
  networkOptions,
  PaymentStep,
  PaymentType,
} from '@utils/constants/meeting-types'
import React, { useContext, useEffect } from 'react'

import { PublicScheduleContext } from '@/components/public-meeting'

const SelectCryptoNetwork = () => {
  const {
    selectedType,
    chain,
    setChain,
    token,
    setToken,
    handleSetTokenAndChain,
    setPaymentStep,
    setPaymentType,
  } = useContext(PublicScheduleContext)
  const selectedNetworkInfo = supportedChains.find(val => val.chain === chain)
  const acceptedTokens = selectedNetworkInfo?.acceptableTokens?.filter(token =>
    [AcceptedToken.USDC, AcceptedToken.CEUR, AcceptedToken.CUSD].includes(
      token.token
    )
  )
  const selectedAssetInfo = acceptedTokens?.find(
    acceptedToken => acceptedToken.token === token
  )

  useEffect(() => {
    if (chain && token) return
    const selectedChain =
      networkOptions.find(
        network => network.id === selectedType?.plan?.default_chain_id
      )?.value || undefined
    const selectedNetworkInfo = supportedChains.find(
      val => val.chain === selectedChain
    )
    const acceptedTokens = selectedNetworkInfo?.acceptableTokens?.filter(
      token =>
        [AcceptedToken.USDC, AcceptedToken.CEUR, AcceptedToken.CUSD].includes(
          token.token
        )
    )

    const selectedToken = acceptedTokens?.[0]?.token || undefined
    handleSetTokenAndChain(selectedToken, selectedChain)
  }, [selectedType])
  const handleContinue = async () => {
    setPaymentStep(PaymentStep.CONFIRM_PAYMENT)
    setPaymentType(PaymentType.CRYPTO)
  }
  return (
    <VStack alignItems="flex-start" w={'100%'} spacing={4}>
      <Heading size="lg">Make your Payment</Heading>
      <Text fontWeight={700}>Select payment method</Text>

      <FormControl>
        <FormLabel>Network to send</FormLabel>
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDownIcon />}
            w={{ base: '100%', md: '60%', lg: '40%' }}
            textAlign="left"
            variant="outline"
          >
            {selectedNetworkInfo ? (
              <HStack>
                <Image
                  src={selectedNetworkInfo.image}
                  alt={selectedNetworkInfo.fullName}
                  boxSize="20px"
                  borderRadius="full"
                  mr={2}
                />
                <Text>{selectedNetworkInfo.fullName}</Text>
              </HStack>
            ) : (
              'Select Network'
            )}
          </MenuButton>
          <MenuList w="100%">
            {networkOptions.map(network => (
              <MenuItem
                key={network.id}
                onClick={() => setChain(network.value)}
              >
                <HStack>
                  <Image
                    src={network.icon}
                    alt={network.name}
                    boxSize="24px"
                    borderRadius="full"
                    mr={2}
                  />
                  <Text>{network.name}</Text>
                </HStack>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </FormControl>
      {selectedNetworkInfo && (
        <FormControl>
          <FormLabel>Select Asset</FormLabel>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              w={{ base: '100%', md: '60%', lg: '40%' }}
              textAlign="left"
              variant="outline"
            >
              {selectedAssetInfo ? (
                <HStack>
                  <Image
                    src={getTokenIcon(selectedAssetInfo.token)}
                    alt={selectedAssetInfo.token}
                    boxSize="20px"
                    borderRadius="full"
                    mr={2}
                  />
                  <Text>{selectedAssetInfo.token}</Text>
                </HStack>
              ) : (
                'Select Asset'
              )}
            </MenuButton>
            <MenuList w="100%">
              {acceptedTokens?.map(token => (
                <MenuItem
                  key={token.token}
                  onClick={async () => setToken(token.token)}
                >
                  <HStack>
                    <Image
                      src={getTokenIcon(token.token)}
                      alt={token.token}
                      boxSize="24px"
                      borderRadius="full"
                      mr={2}
                    />
                    <Text>{token.token}</Text>
                  </HStack>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </FormControl>
      )}
      <Button
        colorScheme="primary"
        disabled={!chain || !token}
        onClick={handleContinue}
      >
        Continue
      </Button>
    </VStack>
  )
}

export default SelectCryptoNetwork
