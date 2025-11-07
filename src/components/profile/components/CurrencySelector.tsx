import {
  Box,
  HStack,
  Icon,
  Image,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { IoChevronDown } from 'react-icons/io5'

interface Currency {
  code: string
  name: string
  flag: string
}

interface CurrencySelectorProps {
  currencies: Currency[]
  selectedCurrency: string
  isCurrencyDropdownOpen: boolean
  exchangeRate: number | undefined
  setIsCurrencyDropdownOpen: (isOpen: boolean) => void
  onCurrencyChange: (currencyCode: string) => void
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currencies,
  selectedCurrency,
  isCurrencyDropdownOpen,
  exchangeRate,
  setIsCurrencyDropdownOpen,
  onCurrencyChange,
}) => {
  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency)

  return (
    <>
      <Box
        bg="bg-surface-tertiary-4"
        borderRadius={{ base: '8px', md: '12px' }}
        px={{ base: 2, md: 3 }}
        py={{ base: '8px', md: '10px' }}
        display="flex"
        alignItems="center"
        gap={2}
        cursor="pointer"
        onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
        _hover={{ opacity: 0.8 }}
      >
        <Image
          src={selectedCurrencyData?.flag}
          alt={selectedCurrency}
          w={{ base: '16px', md: '20px' }}
          h={{ base: '16px', md: '20px' }}
        />
        <Text
          color="text-primary"
          fontSize={{ base: '14px', md: '16px' }}
          fontWeight="500"
        >
          {selectedCurrency}
          {selectedCurrency !== 'USD' && !exchangeRate && (
            <Spinner size="xs" ml={1} color="text-muted" />
          )}
        </Text>
        <Icon
          as={IoChevronDown}
          color="text-secondary"
          fontSize={{ base: '14px', md: '16px' }}
          transform={isCurrencyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
        />
      </Box>

      {/* Currency Dropdown */}
      {isCurrencyDropdownOpen && (
        <Box
          position="absolute"
          top="100%"
          right={0}
          width="max-content"
          minWidth="200px"
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
            {currencies.map(currency => (
              <Box
                key={currency.code}
                px={4}
                py={3}
                cursor="pointer"
                _hover={{ bg: 'dropdown-hover' }}
                onClick={() => onCurrencyChange(currency.code)}
              >
                <HStack spacing={3}>
                  <Image
                    src={currency.flag}
                    alt={currency.code}
                    w="24px"
                    h="24px"
                    borderRadius="full"
                  />
                  <Text color="text-primary" fontSize="16px">
                    {currency.name}
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

export default React.memo(CurrencySelector)
