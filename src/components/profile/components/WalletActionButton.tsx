import { Box, Icon, Text, VStack } from '@chakra-ui/react'
import React from 'react'

interface WalletActionButtonProps {
  icon: React.ComponentType
  label: string
  isActive?: boolean
  onClick?: () => void
}

const WalletActionButton: React.FC<WalletActionButtonProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
}) => (
  <VStack spacing={3}>
    <Box
      w="68px"
      h="54px"
      borderRadius="16px"
      bg={isActive ? 'primary.500' : 'neutral.0'}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      position="relative"
      _hover={{ opacity: 0.8 }}
      transition="all 0.2s"
      boxShadow="0px 1px 2px rgba(0, 0, 0, 0.05)"
      border={isActive ? '2px solid' : 'none'}
      borderColor="neutral.0"
      onClick={onClick}
    >
      <Icon
        as={icon}
        color={isActive ? 'white' : 'primary.500'}
        fontSize="24px"
      />
    </Box>
    <Text fontSize="16px" color="neutral.0" fontWeight="500">
      {label}
    </Text>
  </VStack>
)

export default WalletActionButton
