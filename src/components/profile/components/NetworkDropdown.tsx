import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import React from 'react'

import {
  ChainInfo,
  getNetworkDisplayName,
  SupportedChain,
  supportedChains,
} from '@/types/chains'

interface NetworkDropdownProps {
  networkConfig: Record<string, SupportedChain>
  onSelectNetwork: (chain: SupportedChain) => void
  onClose: () => void
}

const NetworkDropdown: React.FC<NetworkDropdownProps> = ({
  networkConfig,
  onSelectNetwork,
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
        {Object.entries(networkConfig).map(([displayName, chainType]) => {
          const chainInfo = supportedChains.find(c => c.chain === chainType)
          return (
            <Box
              key={chainType}
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: 'dropdown-hover' }}
              onClick={() => {
                onSelectNetwork(chainType)
                onClose()
              }}
            >
              <HStack spacing={3}>
                <Image
                  src={chainInfo?.image || '/assets/chains/ethereum.svg'}
                  alt={displayName}
                  w="24px"
                  h="24px"
                  borderRadius="full"
                />
                <VStack align="start" spacing={0}>
                  <Text color="text-primary" fontSize="16px" fontWeight="500">
                    {displayName}
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

export default React.memo(NetworkDropdown)
