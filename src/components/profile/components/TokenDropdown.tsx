import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import React from 'react'

import {
  AcceptedTokenInfo,
  ChainInfo,
  getTokenIcon,
  getTokenName,
  getTokenSymbol,
} from '@/types/chains'

interface TokenDropdownProps {
  availableTokens: AcceptedTokenInfo[]
  chain: ChainInfo | undefined
  sendNetwork: string
  onSelectToken: (token: AcceptedTokenInfo) => void
  onClose: () => void
}

const TokenDropdown: React.FC<TokenDropdownProps> = ({
  availableTokens,
  chain,
  sendNetwork,
  onSelectToken,
  onClose,
}) => {
  return (
    <Box
      position="absolute"
      top="100%"
      left={0}
      width="max-content"
      minWidth="280px"
      mt={2}
      bg="bg-surface-secondary"
      borderRadius="12px"
      border="1px solid"
      borderColor="border-wallet-subtle"
      shadow="none"
      zIndex={1000}
      overflow="hidden"
      boxShadow="none"
    >
      <VStack spacing={0} align="stretch">
        {availableTokens.map((token: AcceptedTokenInfo) => {
          const tokenName = getTokenName(token.token)
          const tokenSymbol = getTokenSymbol(token.token)

          return (
            <Box
              key={tokenSymbol}
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: 'dropdown-hover' }}
              onClick={async () => {
                await onSelectToken(token)
                onClose()
              }}
            >
              <HStack spacing={3}>
                <Image
                  src={
                    getTokenIcon(token.token) || '/assets/chains/ethereum.svg'
                  }
                  alt={tokenSymbol}
                  w="24px"
                  h="24px"
                  borderRadius="full"
                />
                <VStack align="start" spacing={0}>
                  <Text color="text-primary" fontSize="16px" fontWeight="500">
                    {tokenName}
                  </Text>
                  <Text color="text-muted" fontSize="14px">
                    {chain?.name || sendNetwork}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}

export default React.memo(TokenDropdown)
