import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useContext } from 'react'
import { CheckoutWidget, useActiveWallet } from 'thirdweb/react'
import { Wallet, WalletId } from 'thirdweb/wallets'

import { ChainInfo, supportedChains } from '@/types/chains'
import { Address } from '@/types/Transactions'
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
  } = useContext(PublicScheduleContext)
  const wallet = useActiveWallet()
  const chain = supportedChains.find(
    val => val.chain === selectedChain
  ) as ChainInfo
  const amount =
    (selectedType?.plan?.price_per_slot || 0) *
    (selectedType?.plan?.no_of_slot || 0)
  const { name, userEmail, guestEmail } = useContext(ScheduleStateContext)
  const email = userEmail || guestEmail
  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    acceptedToken => acceptedToken.token === token
  )?.contractAddress as Address
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
