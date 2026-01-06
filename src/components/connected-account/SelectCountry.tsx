import {
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { getStripeOnboardingLink } from '@utils/api_helper'
import { customSelectComponents, Option } from '@utils/constants/select'
import QueryKeys from '@utils/query_keys'
import { queryClient } from '@utils/react_query'
import { useToastHelpers } from '@utils/toasts'
import { Select } from 'chakra-react-select'
import React, { FC, useContext, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'

interface IProps {
  isOpen: boolean
  onClose: () => void
  countries?: Array<Option<string>>
  isCountriesLoading: boolean
}
const SelectCountry: FC<IProps> = props => {
  const [selectedCountry, setSelectedCountry] = useState<
    Option<string> | undefined
  >()
  const { currentAccount } = useContext(AccountContext)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const { showErrorToast } = useToastHelpers()

  const handleSelectCountry = (country: unknown) => {
    if (country) {
      setSelectedCountry(country as Option<string>)
    }
  }
  const handleConnect = async () => {
    if (!selectedCountry?.value) return
    try {
      setIsConnecting(true)

      const url = await getStripeOnboardingLink(selectedCountry?.value)
      window.open(url, '_self')
      await queryClient.invalidateQueries(
        QueryKeys.connectedAccounts(currentAccount?.address)
      )
    } catch (_e) {
      showErrorToast('Error', 'Failed to initiate Stripe onboarding.')
    } finally {
      setIsConnecting(false)
    }
  }
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Select your country</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack alignItems="flex-start" spacing="4">
            <Text size={'base'}>
              Select the country you <b>reside in</b> to continue your Stripe
              onboarding.
            </Text>
            <Select
              value={selectedCountry}
              options={props.countries}
              colorScheme="primary"
              className="noLeftBorder timezone-select"
              onChange={handleSelectCountry}
              components={customSelectComponents}
              isLoading={props.isCountriesLoading}
              chakraStyles={{
                container: provided => ({
                  ...provided,
                  borderColor: 'input-border',
                  bg: 'select-bg',
                }),
              }}
            />
            <Button
              colorScheme="primary"
              onClick={handleConnect}
              ml={'auto'}
              right={0}
              isDisabled={!selectedCountry?.value}
              isLoading={isConnecting}
            >
              Continue
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default SelectCountry
