import { Modal, ModalContent, ModalOverlay, useToast } from '@chakra-ui/react'
import { MeetingReminders } from '@meta/common'
import {
  DEFAULT_MESSAGE_NAME,
  subscribeToMessages,
} from '@utils/pub-sub.helper'
import React, { useContext, useEffect, useState } from 'react'
import { Bridge, toUnits } from 'thirdweb'
import { CheckoutWidget, useActiveWallet } from 'thirdweb/react'
import { Wallet, WalletId } from 'thirdweb/wallets'
import { v4 } from 'uuid'

import { ChainInfo, supportedChains } from '@/types/chains'
import { Address, Transaction } from '@/types/Transactions'
import { thirdWebClient } from '@/utils/user_manager'

import { PublicScheduleContext, ScheduleStateContext } from '.'

type Props = {
  isOpen: boolean
  onClose: () => void
  messageChannel: string
}

const CheckoutWidgetModal = ({ isOpen, onClose, messageChannel }: Props) => {
  const {
    selectedType,
    account,
    chain: selectedChain,
    token,
    handleNavigateToBook,
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
  const wallet = useActiveWallet()
  const [progress, setProgress] = useState(0)
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
    const transaction = await new Promise<Transaction>(
      async (resolve, reject) => {
        await subscribeToMessages(
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
  useEffect(() => {
    void listenForTransaction()
  }, [messageChannel])
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.900" />
      <ModalContent
        p="6"
        bg={'transparent'}
        boxShadow={0}
        alignItems="center"
        justifyContent="center"
      >
        <CheckoutWidget
          client={thirdWebClient}
          chain={chain.thirdwebChain}
          amount={amount.toString()}
          tokenAddress={NATIVE_TOKEN_ADDRESS}
          activeWallet={wallet}
          seller={
            (selectedType?.plan?.payment_address || account.address) as Address
          }
          name={selectedType?.title}
          description={selectedType?.description}
          image={account?.preferences?.avatar_url || '/logo.svg'}
          purchaseData={{
            meetingId: selectedType?.id || '',
            messageChannel,
            guestEmail: email,
            guestName: name,
          }}
          onSuccess={() => {
            alert('Purchase successful!')
            // Redirect or update UI
          }}
        />
      </ModalContent>
    </Modal>
  )
}

export default CheckoutWidgetModal
