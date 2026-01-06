import { Box, Grid, Heading, useDisclosure, VStack } from '@chakra-ui/react'
import AccountCard from '@components/connected-account/AccountCard'
import SelectCountry from '@components/connected-account/SelectCountry'
import Loading from '@components/Loading'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import {
  generateDiscordAccount,
  getConnectedAccounts,
  getStripeSupportedCountries,
} from '@/utils/api_helper'
import { OnboardingSubject } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

const ConnectedAccounts: React.FC = () => {
  const { updateUser, currentAccount } = useContext(AccountContext)
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()
  const { showSuccessToast } = useToastHelpers()

  const { data: connectedAccounts, isLoading: isConnectedAccountsLoading } =
    useQuery({
      queryKey: QueryKeys.connectedAccounts(currentAccount?.address),
      queryFn: getConnectedAccounts,
      enabled: !!currentAccount?.address,
      staleTime: 0,
      refetchOnMount: true,
      onError: (error: unknown) => {
        handleApiError('Error Fetching Connected Accounts', error)
      },
    })
  const { data: supportedCountries, isLoading: isSupportedCountriesLoading } =
    useQuery({
      queryKey: QueryKeys.supportedCountries(),
      queryFn: getStripeSupportedCountries,
      enabled: !!currentAccount?.address,
      staleTime: 1000 * 60 * 60 * 24,
      refetchOnMount: true,
      onError: (error: unknown) => {
        handleApiError('Error Fetching Supported countries', error)
      },
    })
  const {
    isOpen: isSupportedCountryModalOpen,
    onOpen: openSupportedCountryModal,
    onClose: closeSupportedCountryModal,
  } = useDisclosure()

  const generateDiscord = async () => {
    const { code, state } = router.query

    const origin = state
      ? (JSON.parse(Buffer.from(state as string, 'base64').toString())
          ?.origin as OnboardingSubject | undefined)
      : undefined
    if (isConnecting) return
    if (origin && code) {
      setIsConnecting(true)
      const uri = window.location.href.toString()
      if (uri.indexOf('?') > 0) {
        const clean_uri = uri.substring(0, uri.indexOf('?'))
        window.history.replaceState({}, document.title, clean_uri)
      }
      try {
        await generateDiscordAccount(code as string)
        await queryClient.invalidateQueries(
          QueryKeys.account(currentAccount?.address?.toLowerCase())
        )
        await updateUser()
        await queryClient.invalidateQueries(
          QueryKeys.connectedAccounts(currentAccount?.address)
        )
        showSuccessToast(
          'Discord Connected',
          'Your Discord account has been connected'
        )
      } catch (error) {}
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    void generateDiscord()
  }, [router.query])
  return (
    <VStack w={'100%'} alignItems="flex-start">
      <Heading id="connected" fontSize="2xl" mb={8}>
        Connected Accounts
      </Heading>
      {isConnectedAccountsLoading || isConnecting ? (
        <Box mx="auto">
          <Loading />
        </Box>
      ) : (
        <Grid
          templateColumns={{ md: 'repeat(2, 1fr)', base: '1fr' }}
          gap={6}
          mb={12}
          w={'100%'}
        >
          {connectedAccounts?.map(account => (
            <AccountCard
              account={account.account}
              info={account.info}
              key={`connected-account-${account.account}`}
              openSelectCountry={openSupportedCountryModal}
            />
          ))}
        </Grid>
      )}
      <SelectCountry
        countries={supportedCountries}
        isCountriesLoading={isSupportedCountriesLoading}
        isOpen={isSupportedCountryModalOpen}
        onClose={closeSupportedCountryModal}
      />
    </VStack>
  )
}

export default ConnectedAccounts
