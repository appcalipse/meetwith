import {
  Flex,
  Modal,
  ModalContent,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react'
import { useModal } from 'connectkit'
import { useSearchParams } from 'next/navigation'
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

import { OnboardingSubject } from '@/utils/constants'

import { AccountContext } from '../../providers/AccountProvider'

let didInit = false
let didOpenConnectWallet = false

const OnboardingModal = forwardRef((props, ref) => {
  const queryParams = useSearchParams()
  const state = queryParams.get('state')

  const origin = state
    ? (JSON.parse(Buffer.from(state as string, 'base64').toString())?.origin as
        | OnboardingSubject
        | undefined)
    : undefined

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { setOpen } = useModal()

  const { currentAccount } = useContext(AccountContext)

  const [subject, setSubject] = useState<OnboardingSubject>()

  useImperativeHandle(ref, () => ({
    onOpen,
    onClose,
    isOpen,
  }))

  useEffect(() => {
    if (!!currentAccount?.address && !didInit) {
      if (
        origin === OnboardingSubject.DiscordConnectedModal &&
        !!currentAccount.discord_account
      ) {
        setSubject(OnboardingSubject.DiscordConnectedModal)
        onOpen()
        didInit = true
      }
    } else if (!!origin && !didOpenConnectWallet) {
      setOpen(true)
      didOpenConnectWallet = true
    }
  }, [currentAccount, onOpen, origin, setOpen])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent padding={20} maxW="45rem">
          <Flex>First Step</Flex>
        </ModalContent>
      </Modal>
    </>
  )
})

OnboardingModal.displayName = 'OnboardingModal'
export default OnboardingModal
