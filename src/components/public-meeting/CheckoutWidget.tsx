import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useContext } from 'react'
import { CheckoutWidget } from 'thirdweb/react'
import { Wallet, WalletId } from 'thirdweb/wallets'
import { v4 } from 'uuid'

import { ChainInfo } from '@/types/chains'
import { Address } from '@/types/Transactions'
import { thirdWebClient } from '@/utils/user_manager'

import { PublicScheduleContext, ScheduleStateContext } from '.'

type Props = {
  chain: ChainInfo
  amount: number
  email: string
  messageChannel: string
  activeWallet: Wallet<WalletId> | undefined
}

const CheckoutWidgetModal = ({
  chain,
  amount,
  email,
  messageChannel,
  activeWallet,
}: Props) => {
  const { selectedType, account, token } = useContext(PublicScheduleContext)
  const { name } = useContext(ScheduleStateContext)
  const NATIVE_TOKEN_ADDRESS = chain?.acceptableTokens?.find(
    acceptedToken => acceptedToken.token === token
  )?.contractAddress as Address
  return (
    <Modal
      isOpen
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
          activeWallet={activeWallet}
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
