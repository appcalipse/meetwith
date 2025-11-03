import { Box, HStack, Icon, Image, Text, VStack } from '@chakra-ui/react'
import React from 'react'
import { IoChevronDown } from 'react-icons/io5'

import { getChainId, SupportedChain, supportedChains } from '@/types/chains'

interface Network {
  name: string
  icon: string
  chainId: number
}

interface NetworkSelectorProps {
  networks: Network[]
  selectedNetwork: SupportedChain
  isNetworkDropdownOpen: boolean
  isNetworkLoading: boolean
  setIsNetworkDropdownOpen: (open: boolean) => void
  setSelectedNetwork: (network: SupportedChain) => void
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  networks,
  selectedNetwork,
  isNetworkDropdownOpen,
  isNetworkLoading,
  setIsNetworkDropdownOpen,
  setSelectedNetwork,
}) => {
  const selectedChain = networks.find(
    n => n.chainId === getChainId(selectedNetwork)
  )

  return (
    <>
      <Box
        bg="bg-surface-tertiary"
        borderRadius={{ base: '8px', md: '12px' }}
        px={{ base: 3, md: 4 }}
        py={2}
        display="flex"
        alignItems="center"
        gap={2}
        cursor="pointer"
        onClick={() =>
          !isNetworkLoading && setIsNetworkDropdownOpen(!isNetworkDropdownOpen)
        }
        _hover={{ opacity: 0.8 }}
        border="1px solid"
        borderColor="border-subtle"
      >
        <Image
          src={selectedChain?.icon}
          alt={selectedChain?.name || selectedNetwork}
          borderRadius="full"
          w={{ base: '16px', md: '20px' }}
          h={{ base: '16px', md: '20px' }}
        />
        <Text
          color="text-primary"
          fontSize={{ base: '14px', md: '16px' }}
          fontWeight="700"
          pr={{ base: 2, md: 4 }}
        >
          {selectedChain?.name || selectedNetwork}
        </Text>
        <Icon
          as={IoChevronDown}
          color="text-primary"
          fontSize={{ base: '16px', md: '16px' }}
          transform={isNetworkDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
        />
      </Box>

      {/* Network Dropdown */}
      {isNetworkDropdownOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          width="max-content"
          minWidth="250px"
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
            {networks.map(network => (
              <Box
                key={network.name}
                px={4}
                py={3}
                cursor="pointer"
                _hover={{ bg: 'dropdown-hover' }}
                onClick={() => {
                  const supportedChain = supportedChains.find(
                    c => c.name === network.name
                  )
                  if (supportedChain) {
                    setSelectedNetwork(supportedChain.chain)
                    setIsNetworkDropdownOpen(false)
                  }
                }}
              >
                <HStack spacing={3}>
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="full"
                    bg="bg-surface-tertiary-2"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                  >
                    <Image
                      src={network.icon}
                      alt={network.name}
                      w="16px"
                      h="16px"
                    />
                  </Box>
                  <Text color="text-primary" fontSize="16px">
                    {network.name}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </>
  )
}

export default React.memo(NetworkSelector)
