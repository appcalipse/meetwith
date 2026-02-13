import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import {
  DEFAULT_SUBSCRIPTION_MESSAGE_NAME,
  PubSubManager,
} from '@utils/pub-sub.helper'
import React, { useEffect, useRef } from 'react'
import { CheckoutWidget, useActiveWallet } from 'thirdweb/react'

import useAccountContext from '@/hooks/useAccountContext'
import { ChainInfo, SupportedChain, supportedChains } from '@/types/chains'
import { Address, ISubscriptionData, Transaction } from '@/types/Transactions'
import { SUBSCRIPTION_PAYMENT_RECEIVER_ADDRESS } from '@/utils/constants'
import { useToastHelpers } from '@/utils/toasts'
import { thirdWebClient } from '@/utils/user_manager'

type Props = {
  isOpen: boolean
  onClose: () => void
  subscriptionData: ISubscriptionData
  amount: number
  chain: ChainInfo
  token: string
  country?: string
  onSuccess: () => void
}

const SubscriptionCheckoutModal = ({
  isOpen,
  onClose,
  subscriptionData,
  amount,
  chain,
  token,
  country,
  onSuccess,
}: Props) => {
  const subscriptionRef = useRef<boolean>(false)
  const wallet = useActiveWallet()
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    acceptedToken => acceptedToken.token === token
  )?.contractAddress as Address

  const handlePaymentError = (error: Error) => {
    showErrorToast('Payment Failed', error.message)
    subscriptionRef.current = false
  }

  const listenForTransaction = async () => {
    try {
      if (subscriptionRef.current) {
        return
      }
      subscriptionRef.current = true

      const pubSubManager = new PubSubManager()
      const transaction = await new Promise<Transaction>(async resolve => {
        await pubSubManager.subscribeToMessages(
          subscriptionData.subscription_channel,
          DEFAULT_SUBSCRIPTION_MESSAGE_NAME,
          message => {
            const transaction = JSON.parse(message.data) as Transaction
            resolve(transaction)
          }
        )
      })

      await pubSubManager.unsubscribeFromMessages(
        subscriptionData.subscription_channel,
        DEFAULT_SUBSCRIPTION_MESSAGE_NAME
      )

      if (transaction.transaction_hash) {
        onSuccess()
        onClose()
        showSuccessToast(
          'Subscription Successful',
          'Your subscription has been activated.'
        )
      } else {
        showErrorToast(
          'Payment Failed',
          'Transaction was not found on the blockchain'
        )
        void listenForTransaction()
      }
    } catch (e) {
      console.error('Error listening for subscription transaction:', e)
    } finally {
      subscriptionRef.current = false
    }
  }

  useEffect(() => {
    if (!isOpen || !subscriptionData.subscription_channel) {
      return
    }
    void listenForTransaction()
  }, [subscriptionData.subscription_channel])

  const sellerAddress = SUBSCRIPTION_PAYMENT_RECEIVER_ADDRESS as Address

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.900">
        <ModalCloseButton top={10} right={10} size={'45'} />
      </ModalOverlay>
      <ModalContent
        p="6"
        bg={'transparent'}
        boxShadow={0}
        alignItems="center"
        justifyContent="center"
      >
        <CheckoutWidget
          client={thirdWebClient}
          chain={chain?.thirdwebChain}
          amount={amount.toString()}
          tokenAddress={NATIVE_TOKEN_ADDRESS}
          activeWallet={wallet}
          country={country}
          seller={sellerAddress}
          name="Meetwith Premium Subscription"
          description={`${
            subscriptionData.billing_plan_id === 'yearly' ? 'Yearly' : 'Monthly'
          } subscription plan`}
          purchaseData={subscriptionData}
          onError={handlePaymentError}
        />
      </ModalContent>
    </Modal>
  )
}

export default SubscriptionCheckoutModal
