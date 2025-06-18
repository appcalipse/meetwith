import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import React, { Reducer, useContext, useMemo } from 'react'
import {
  Bridge,
  prepareContractCall,
  sendTransaction,
  toUnits,
  waitForReceipt,
} from 'thirdweb'
import { useActiveWallet, useConnect } from 'thirdweb/react'
import { createWallet } from 'thirdweb/wallets'
import { Address } from 'viem'

import { AcceptedToken, ChainInfo, supportedChains } from '@/types/chains'
import { isProduction } from '@/utils/constants'
import { formatCurrency, parseUnits } from '@/utils/generic_utils'
import {
  ErrorAction,
  errorReducerSingle,
  ErrorState,
  PaymentInfo,
  validatePaymentInfo,
} from '@/utils/schemas'
import { getTokenBalance, getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

const ConfirmPaymentInfo = () => {
  const { setPaymentType, setPaymentStep, paymentType, selectedType, account } =
    useContext(PublicScheduleContext)
  const toast = useToast({ position: 'top', isClosable: true })
  const wallet = useActiveWallet()
  console.log({ wallet }, 'here..')
  const chain = supportedChains.find(
    val => val.id === selectedType?.plan?.default_chain_id
  ) as ChainInfo

  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    token => token.token === AcceptedToken.USDC
  )?.contractAddress as Address
  const handlePay = async () => {
    const amount =
      selectedType!.plan!.price_per_slot! * selectedType!.plan!.no_of_slot!
    if (paymentType === PaymentType.CRYPTO) {
      try {
        const signingAccount =
          wallet?.getAccount() ||
          (await wallet?.connect({ client: thirdWebClient }))

        console.log({ signingAccount })
        if (signingAccount) {
          console.log({ chain })
          const balance = await getTokenBalance(
            signingAccount.address,
            NATIVE_TOKEN_ADDRESS,
            chain.chain
          )
          const tokenInfo = await getTokenInfo(
            NATIVE_TOKEN_ADDRESS,
            chain.chain
          )
          console.log({ tokenInfo })
          if (!tokenInfo?.decimals) return // Unable to get token details
          const transferAmount = parseUnits(`${amount}`, tokenInfo?.decimals)
          if (balance < transferAmount) {
            // Make this a toast
            console.error(
              `Insufficient balance. Required: ${transferAmount}, Available: ${balance}`
            )
            return
          }
          const transaction = prepareContractCall({
            contract: tokenInfo?.contract,
            method: 'transfer',
            params: [
              selectedType?.plan?.payment_address || account.address,
              transferAmount,
            ],
          })

          const { transactionHash, ...rest } = await sendTransaction({
            account: signingAccount,
            transaction,
          })
          toast({
            title: 'Transaction Submitted',
            description: `Transaction hash: ${transactionHash}`,
            status: 'info',
            duration: 5000,
          })
          const receipt = await waitForReceipt({
            client: thirdWebClient,
            chain: chain.thirdwebChain,
            transactionHash,
          })
          if (receipt.status === 'success') {
            toast({
              title: 'Payment Successful!',
              description: 'Your payment has been confirmed on the blockchain',
              status: 'success',
              duration: 5000,
            })

            // Handle success - redirect or update state
            // await handlePaymentSuccess(transactionHash, receipt)
          } else {
            throw new Error('Transaction failed')
          }
          console.log({ transactionHash, rest })
          // implement transaction store data here
        }
      } catch (e: unknown) {
        const error = e as Error
        console.error('Payment failed:', error)
        toast({
          title: 'Payment Failed',
          description: error.message || 'Transaction was rejected or failed',
          status: 'error',
          duration: 5000,
        })
      }
    } else {
      const preparedOnramp = await Bridge.Onramp.prepare({
        client: thirdWebClient,
        onramp: 'transak',
        chainId: chain.id,
        tokenAddress: NATIVE_TOKEN_ADDRESS,
        receiver: selectedType?.plan?.payment_address || account.address, // receiver's address
        amount: toUnits('500', 6), // 10 of the destination token
        // Optional params:
        // sender: "0x...", // sender's address
        // onrampTokenAddress: NATIVE_TOKEN_ADDRESS, // token to initially onramp to
        // onrampChainId: 1, // chain to initially onramp to
        currency: 'USD',
        // maxSteps: 2,
        purchaseData: { customId: '123' },
      })
      console.log({ preparedOnramp })
      console.log(preparedOnramp.link) // URL to redirect the user to
      console.log(preparedOnramp.currencyAmount)
    }
  }
  const [errors, dispatchErrors] = React.useReducer<
    Reducer<
      ErrorState<keyof PaymentInfo, '', never>,
      ErrorAction<keyof PaymentInfo>
    >
  >(errorReducerSingle, {})

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const handleBack = () => {
    setPaymentType(null)
    setPaymentStep(
      paymentType === PaymentType.FIAT
        ? PaymentStep.SELECT_PAYMENT_METHOD
        : PaymentStep.SELECT_CRYPTO_NETWORK
    )
  }
  const handleBlur = (field: keyof PaymentInfo, value: string) => {
    const { isValid, error } = validatePaymentInfo(field, value)
    if (!isValid && error) {
      dispatchErrors({
        type: 'SET_ERROR',
        field,
        message: error,
      })
    } else {
      dispatchErrors({ type: 'CLEAR_ERROR', field })
    }
  }
  const DETAILS = useMemo(
    () => [
      {
        label: 'Plan',
        value:
          'Personalized Figma and design system training, for individuals, teams, and companies.',
      },
      {
        label: 'Number of Sessions',
        value: `${selectedType?.plan?.no_of_slot} sessions`,
      },
      {
        label: 'Price',
        value: selectedType?.plan
          ? formatCurrency(
              selectedType?.plan?.price_per_slot *
                selectedType?.plan?.no_of_slot,
              'USD',
              2
            )
          : '$0',
      },
      {
        label: 'Payment Method',
        value: paymentType === PaymentType.FIAT ? 'Card' : 'Crypto',
      },
    ],
    [paymentType, selectedType?.plan]
  )
  return (
    <VStack alignItems="flex-start" w="100%" gap={6}>
      <HStack
        color={'primary.400'}
        onClick={handleBack}
        left={6}
        w={'fit-content'}
        cursor="pointer"
        role={'button'}
      >
        <ArrowBackIcon w={6} h={6} />
        <Text fontSize={16}>Back</Text>
      </HStack>
      <Heading size="md">Confirm Payment Info</Heading>
      <VStack alignItems="flex-start" w={{ base: '100%', md: '30%' }} gap={4}>
        <FormControl
          width={'100%'}
          justifyContent={'space-between'}
          alignItems="flex-start"
          isInvalid={!!errors.name}
        >
          <FormLabel fontSize={'16px'}>Full name</FormLabel>
          <Input
            placeholder="Enter your full name"
            borderColor="neutral.400"
            width={'max-content'}
            w="100%"
            errorBorderColor="red.500"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => handleBlur('name', name)}
          />
          {!!errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
        </FormControl>
        <FormControl
          width={'100%'}
          justifyContent={'space-between'}
          alignItems="flex-start"
          isInvalid={!!errors.email}
        >
          <FormLabel fontSize={'16px'}>Email address</FormLabel>
          <Input
            placeholder="Enter your email address"
            borderColor="neutral.400"
            width={'max-content'}
            w="100%"
            errorBorderColor="red.500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => handleBlur('email', email)}
          />
          {!!errors.email && (
            <FormErrorMessage>{errors.email}</FormErrorMessage>
          )}
        </FormControl>
      </VStack>
      <VStack w="100%" gap={0}>
        {DETAILS.map((detail, index, arr) => (
          <HStack
            key={index}
            justifyContent="space-between"
            w="100%"
            alignItems="flex-start"
            py={7}
            borderTopWidth={index === 0 ? 1 : 0.5}
            borderBottomWidth={index === arr.length - 1 ? 1 : 0.5}
            borderColor="neutral.600"
          >
            <Text fontSize="medium" fontWeight={700} flexBasis="40%">
              {detail.label}
            </Text>
            <Text fontSize="medium" fontWeight={500} flexBasis="40%">
              {detail.value}
            </Text>
          </HStack>
        ))}
      </VStack>
      <Button colorScheme="primary" onClick={handlePay}>
        Pay Now
      </Button>
    </VStack>
  )
}

export default ConfirmPaymentInfo
