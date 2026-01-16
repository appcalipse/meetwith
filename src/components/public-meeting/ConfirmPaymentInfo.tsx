import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  Progress,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import {
  PublicScheduleContext,
  ScheduleStateContext,
} from '@components/public-meeting/index'
import PaymentDetails from '@components/public-meeting/PaymentDetails'
import { MeetingReminders } from '@meta/common'
import { ConfirmCryptoTransactionRequest } from '@meta/Requests'
import { createCryptoTransaction, requestInvoice } from '@utils/api_helper'
import {
  PaymentStep,
  PaymentType,
  TokenType,
} from '@utils/constants/meeting-types'
import {
  ChainNotFound,
  InValidGuests,
  TransactionCouldBeNotFoundError,
} from '@utils/errors'
import { useRouter } from 'next/router'
import React, { Reducer, useContext } from 'react'
import {
  Bridge,
  prepareContractCall,
  sendTransaction,
  toUnits,
  waitForReceipt,
} from 'thirdweb'
import { useActiveWallet } from 'thirdweb/react'
import { Wallet } from 'thirdweb/wallets'
import { v4 } from 'uuid'
import { Address, formatUnits } from 'viem'
import { z } from 'zod'

import useAccountContext from '@/hooks/useAccountContext'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { AcceptedToken, ChainInfo, supportedChains } from '@/types/chains'
import { Transaction } from '@/types/Transactions'
import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'
import { parseUnits } from '@/utils/generic_utils'
import { DEFAULT_MESSAGE_NAME, PubSubManager } from '@/utils/pub-sub.helper'
import {
  ErrorAction,
  ErrorState,
  errorReducerSingle,
  PaymentInfo,
  paymentInfoSchema,
  validatePaymentInfo,
} from '@/utils/schemas'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { getTokenBalance, getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

const ConfirmPaymentInfo = () => {
  const {
    setPaymentType,
    setPaymentStep,
    paymentType,
    selectedType,
    account,
    handleNavigateToBook,
    chain: selectedChain,
    token,
  } = useContext(PublicScheduleContext)
  const {
    confirmSchedule,
    participants,
    meetingProvider,
    meetingNotification,
    meetingRepeat,
    content,
    name,
    setName,
    title,
    doSendEmailReminders,
    scheduleType,
    meetingUrl,
    pickedTime,
    userEmail,
    guestEmail,
  } = useContext(ScheduleStateContext)
  const toast = useToast({ position: 'top', isClosable: true })
  const currentAccount = useAccountContext()
  const wallet = useActiveWallet()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const [errors, dispatchErrors] = React.useReducer<
    Reducer<
      ErrorState<keyof PaymentInfo, '', never>,
      ErrorAction<keyof PaymentInfo>
    >
  >(errorReducerSingle, {})
  const [email, setEmail] = React.useState(guestEmail || userEmail)
  const { openConnection } = useContext(OnboardingModalContext)
  const [isInvoiceLoading, setIsInvoiceLoading] = React.useState(false)

  const [progress, setProgress] = React.useState(0)

  const chain = supportedChains.find(
    val => val.chain === selectedChain
  ) as ChainInfo
  const { query } = useRouter()
  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    acceptedToken => acceptedToken.token === token
  )?.contractAddress as Address
  const tokenPriceFeed = new PriceFeedService()
  const [loading, setLoading] = React.useState(false)
  const amount =
    (selectedType?.plan?.price_per_slot || 0) *
    (selectedType?.plan?.no_of_slot || 0)
  const handlePay = async () => {
    dispatchErrors({ type: 'CLEAR_ALL' })
    try {
      paymentInfoSchema.parse({ name, email })
    } catch (e) {
      if (e instanceof z.ZodError) {
        e.errors.forEach(err => {
          toast({
            title: 'Validation Error',
            description: err.message,
            status: 'error',
            duration: 5000,
          })
          dispatchErrors({
            type: 'SET_ERROR',
            field: err.path.join('.') as keyof PaymentInfo,
            message: err.message,
          })
        })
      }
      return
    }

    setLoading(true)
    try {
      if (paymentType === PaymentType.CRYPTO) {
        if (!currentAccount?.address) {
          openConnection(undefined, false)
          toast({
            title: 'Account Not Found',
            description: 'Please login to proceed.',
            status: 'error',
            duration: 5000,
          })
          setLoading(false)
          return
        }
        setProgress(0)
        let currentWallet: Wallet | undefined | null = wallet
        if (needsReconnection) {
          currentWallet = await attemptReconnection()
        }
        const signingAccount = currentWallet?.getAccount()

        if (signingAccount && chain) {
          const currentChainId = await currentWallet?.getChain()?.id

          if (currentChainId !== chain.thirdwebChain.id) {
            toast({
              title: 'Network Switch Required',
              description: `Please switch to ${chain.name} to continue`,
              status: 'warning',
              duration: 5000,
            })

            try {
              await currentWallet?.switchChain(chain.thirdwebChain)
              toast({
                title: 'Network Switched',
                description: `Successfully switched to ${chain.name}`,
                status: 'success',
                duration: 3000,
              })
            } catch (switchError) {
              console.error('Network switch failed:', switchError)
              toast({
                title: 'Network Switch Failed',
                description: 'Please switch networks manually in your wallet',
                status: 'error',
                duration: 5000,
              })
              setLoading(false)
              return
            }
          }
          const balance = await getTokenBalance(
            signingAccount.address,
            NATIVE_TOKEN_ADDRESS,
            chain.chain
          )
          const tokenInfo = await getTokenInfo(
            NATIVE_TOKEN_ADDRESS,
            chain.chain
          )
          if (!tokenInfo?.decimals) return // Unable to get token details
          const tokenMarketPrice = await tokenPriceFeed.getPrice(
            chain.chain,
            AcceptedToken.USDC
          )
          const transferAmount = parseUnits(
            `${amount / tokenMarketPrice}`,
            tokenInfo?.decimals
          )
          if (balance < transferAmount) {
            // Make this a toast
            toast({
              title: 'Insufficient Balance',
              description: `You need ${formatUnits(
                transferAmount - balance,
                tokenInfo?.decimals
              )} ${tokenInfo?.itemSymbol} more to complete this transaction.`,
              status: 'error',
              duration: 5000,
            })
            setLoading(false)
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

          const { transactionHash } = await sendTransaction({
            account: signingAccount,
            transaction,
          })
          setProgress(40)
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
          setProgress(60)
          if (receipt.status === 'success') {
            toast({
              title: 'Payment Successful!',
              description: 'Your payment has been confirmed on the blockchain',
              status: 'success',
              duration: 5000,
            })
          } else {
            throw new Error('Transaction failed')
          }

          const payload: ConfirmCryptoTransactionRequest = {
            transaction_hash: transactionHash,
            amount: parseFloat(
              formatUnits(transferAmount, tokenInfo?.decimals)
            ),
            meeting_type_id: selectedType?.id || '',
            token_address: NATIVE_TOKEN_ADDRESS,
            token_type: TokenType.ERC20,
            chain: chain.chain,
            fiat_equivalent: amount,
            guest_address: currentAccount?.address,
            guest_email: email,
            guest_name: name,
            payment_method: PaymentType.CRYPTO,
          }
          setProgress(90)
          await createCryptoTransaction(payload)
          setProgress(100)
          handleNavigateToBook(transactionHash)
          await confirmSchedule(
            scheduleType!,
            pickedTime!,
            guestEmail,
            name,
            content,
            meetingUrl,
            doSendEmailReminders ? userEmail : undefined,
            title,
            participants,
            meetingProvider,
            meetingNotification.map(n => n.value as MeetingReminders),
            meetingRepeat.value,
            transactionHash
          )
        } else if (!signingAccount) {
          openConnection(undefined, false)
          toast({
            title: 'Wallet Not Connected',
            description: 'Please connect your wallet to proceed.',
            status: 'error',
            duration: 5000,
          })
          setLoading(false)
          return
        }
      } else {
        if ((selectedType?.plan?.no_of_slot || 0) > 1) {
          openConnection(undefined, false)
          toast({
            title: 'Account Not Found',
            description:
              'You have to be logged in to pay for multiple slots, Please login to proceed.',
            status: 'error',
          })
          setLoading(false)
          return
        }
        const transaction = await new Promise<Transaction>(
          async (resolve, reject) => {
            const messageChannel = `onramp:${v4()}:${selectedType?.id || ''}`
            const pubSubManager = new PubSubManager()
            await pubSubManager.subscribeToMessages(
              messageChannel,
              DEFAULT_MESSAGE_NAME,
              message => {
                const transaction = JSON.parse(message.data) as Transaction
                resolve(transaction)
              }
            )
            const preparedOnramp = await Bridge.Onramp.prepare({
              client: thirdWebClient,
              onramp: 'transak',
              chainId: chain?.id,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
              receiver: (selectedType?.plan?.payment_address ||
                account.address) as Address,
              amount: toUnits(amount.toString(), 6),
              currency: 'USD',
              purchaseData: {
                meetingId: selectedType?.id || '',
                messageChannel,
                guestEmail: email,
                guestName: name,
              },
            })
            window.open(preparedOnramp.link, '_blank', 'noopener,noreferrer')
            setProgress(40)
          }
        )
        if (transaction.transaction_hash) {
          setProgress(100)
          handleNavigateToBook(transaction.transaction_hash)
          // persist the transaction in localStorage in-case the schedule fails
          localStorage.setItem(
            `${selectedType?.id || ''}:transaction`,
            JSON.stringify(transaction)
          )
          await confirmSchedule(
            scheduleType!,
            pickedTime!,
            guestEmail,
            name,
            content,
            meetingUrl,
            doSendEmailReminders ? userEmail : undefined,
            title,
            participants,
            meetingProvider,
            meetingNotification.map(n => n.value as MeetingReminders),
            meetingRepeat.value,
            transaction.transaction_hash
          )
        } else {
          toast({
            title: 'Payment Failed',
            description: 'Transaction was not found on the blockchain',
            status: 'error',
            duration: 5000,
          })
        }
      }
    } catch (error: unknown) {
      if (error instanceof TransactionCouldBeNotFoundError) {
        toast({
          title: 'Transaction Not Found',
          description:
            error.message || 'Transaction was not found on the blockchain',
          status: 'error',
          duration: 5000,
        })
      } else if (error instanceof ChainNotFound) {
        toast({
          title: 'Chain Not Found',
          description: error.message || 'The specified chain does not exist',
          status: 'error',
          duration: 5000,
        })
      } else if (error instanceof InValidGuests) {
        toast({
          title: 'Invalid Guests',
          description: error.message || 'Guest email or address is required.',
          status: 'error',
          duration: 5000,
        })
      } else if (error instanceof Error) {
        console.error('Payment failed:', error)
        toast({
          title: 'Payment Failed',
          description: error.message || 'Transaction was rejected or failed',
          status: 'error',
          duration: 5000,
        })
      } else {
        // Fallback for unexpected errors
        toast({
          title: 'Payment Failed',
          description:
            (error as Error)?.message || 'Transaction was rejected or failed',
          status: 'error',
          duration: 5000,
        })
      }
    }
    setLoading(false)
  }
  const handleRequestInvoice = async () => {
    setIsInvoiceLoading(true)
    try {
      const baseUrl = `${appUrl}/${getAccountDomainUrl(account)}/${
        selectedType?.slug || ''
      }`

      const params = new URLSearchParams({
        payment_type: paymentType || '',
        title,
        name,
        email,
        schedule_type: String(scheduleType),
        meeting_provider: meetingProvider,
        content,
        participants: JSON.stringify(participants),
        meeting_notification: meetingNotification
          .map(val => val.value)
          .join(','),
        meeting_repeat: meetingRepeat.value,
        do_send_email_reminders: String(doSendEmailReminders),
        picked_time: pickedTime?.toISOString() || '',
        guest_email: email,
        meeting_url: meetingUrl,
        user_email: userEmail,
      })

      if (paymentType === PaymentType.CRYPTO && token && selectedChain) {
        params.append('token', token)
        params.append('chain', selectedChain)
      }

      const url = `${baseUrl}?${params.toString()}`
      const response = await requestInvoice({
        guest_email: email,
        guest_name: name,
        meeting_type_id: selectedType?.id || '',
        payment_method: paymentType || PaymentType.FIAT,
        url,
      })
      if (response.success) {
        toast({
          title: 'Invoice Requested',
          description:
            "We've received your invoice request! It'll be sent to your email shortly.",
          status: 'success',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error requesting invoice:', error)
      if (error instanceof Error) {
        toast({
          title: 'Invoice Request Failed',
          description:
            error.message || 'An error occurred while requesting the invoice.',
          status: 'error',
          duration: 5000,
        })
      }
    }
    setIsInvoiceLoading(false)
  }

  const handleBack = () => {
    setPaymentType(undefined)
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
      <PaymentDetails />
      <HStack w="100%" justifyContent="space-between">
        <HStack>
          <Button
            colorScheme="primary"
            isDisabled={!name || !email || !!errors.name || !!errors.email}
            onClick={handlePay}
            isLoading={loading}
          >
            Pay & Complete Schedule
          </Button>
          {loading && (
            <HStack ml={12}>
              <Progress
                value={progress}
                min={0}
                max={100}
                w={150}
                rounded={'full'}
                borderWidth={2}
                borderColor="green.400"
                colorScheme="green"
                p={'2px'}
                size="lg"
                sx={{
                  '& > div': {
                    backgroundColor: 'green.400',
                    rounded: 'full',
                  },
                }}
              />
              <Text>
                {progress === 100 ? 'Payment Successful' : `${progress}%`}
              </Text>
            </HStack>
          )}
        </HStack>
        {query.type !== 'direct-invoice' && (
          <Button
            variant="outline"
            colorScheme="primary"
            onClick={() => handleRequestInvoice()}
            isLoading={isInvoiceLoading}
            isDisabled={!name || !email || !!errors.name || !!errors.email}
          >
            Request Invoice
          </Button>
        )}
      </HStack>
    </VStack>
  )
}

export default ConfirmPaymentInfo
