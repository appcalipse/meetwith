import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { MeetingReminders } from '@meta/common'
import { DEFAULT_MESSAGE_NAME, PubSubManager } from '@utils/pub-sub.helper'
import React, { useContext, useEffect, useRef } from 'react'
import { CheckoutWidget, useActiveWallet } from 'thirdweb/react'

import useAccountContext from '@/hooks/useAccountContext'
import { ChainInfo, supportedChains } from '@/types/chains'
import { Address, IPurchaseData, Transaction } from '@/types/Transactions'
import { thirdWebClient } from '@/utils/user_manager'

import { PublicScheduleContext, ScheduleStateContext } from '.'

type Props = {
  isOpen: boolean
  onClose: () => void
  messageChannel: string
  country?: string
}

const CheckoutWidgetModal = ({
  isOpen,
  onClose,
  messageChannel,
  country,
}: Props) => {
  const {
    selectedType,
    account,
    chain: selectedChain,
    token,
    handleNavigateToBook,
    setIsAwaitingScheduling,
  } = useContext(PublicScheduleContext)
  const {
    confirmSchedule,
    participants,
    meetingProvider,
    meetingNotification,
    meetingRepeat,
    content,
    name,
    title,
    doSendEmailReminders,
    scheduleType,
    meetingUrl,
    pickedTime,
    userEmail,
    guestEmail,
  } = useContext(ScheduleStateContext)
  const currentAccount = useAccountContext()
  const subscriptionRef = useRef<boolean>(false)
  const wallet = useActiveWallet()
  const chain = supportedChains.find(
    val => val.chain === selectedChain
  ) as ChainInfo
  const amount =
    (selectedType?.plan?.price_per_slot || 0) *
    (selectedType?.plan?.no_of_slot || 0)
  const toast = useToast()
  const email = userEmail || guestEmail
  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    acceptedToken => acceptedToken.token === token
  )?.contractAddress as Address
  const listenForTransaction = async () => {
    try {
      if (subscriptionRef.current) {
        return
      }
      subscriptionRef.current = true

      const pubSubManager = new PubSubManager()
      const transaction = await new Promise<Transaction>(async resolve => {
        await pubSubManager.subscribeToMessages(
          messageChannel,
          DEFAULT_MESSAGE_NAME,
          message => {
            const transaction = JSON.parse(message.data) as Transaction
            resolve(transaction)
          }
        )
      })
      setIsAwaitingScheduling(true)

      await pubSubManager.unsubscribeFromMessages(
        messageChannel,
        DEFAULT_MESSAGE_NAME
      )
      if (transaction.transaction_hash) {
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
        subscriptionRef.current = false
        toast({
          title: 'Payment Failed',
          description: 'Transaction was not found on the blockchain',
          status: 'error',
          duration: 5000,
        })
        void listenForTransaction()
      }
      setIsAwaitingScheduling(false)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    void listenForTransaction()
  }, [messageChannel])
  const metadata: IPurchaseData = {
    meeting_type_id: selectedType?.id || '',
    message_channel: messageChannel,
    guest_email: email,
    guest_name: name,
    guest_address: currentAccount?.address,
    environment: process.env.NEXT_PUBLIC_ENV_CONFIG || '',
  }
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
          seller={
            (selectedType?.plan?.payment_address || account.address) as Address
          }
          name={selectedType?.title}
          description={selectedType?.description}
          purchaseData={metadata}
          onSuccess={() => setIsAwaitingScheduling(true)}
          onError={(error: Error) => {
            toast({
              title: 'Payment Failed',
              description: error.message,
              status: 'error',
              duration: 5000,
            })
            setIsAwaitingScheduling(false)
            onClose()
            subscriptionRef.current = false
          }}
        />
      </ModalContent>
    </Modal>
  )
}

export default CheckoutWidgetModal
