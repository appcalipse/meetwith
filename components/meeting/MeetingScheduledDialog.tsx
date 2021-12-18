import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Image,
  Text,
  Flex,
} from '@chakra-ui/react'
import dayjs from '../../utils/dayjs_extender'
import router from 'next/router'
import { Account } from '../../types/Account'
import { MeetingDecrypted } from '../../types/Meeting'
import { getAccountDisplayName } from '../../utils/user_manager'

interface IProps {
  isOpen: boolean
  onClose: () => void
  targetAccount: Account
  meeting?: MeetingDecrypted
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  isOpen,
  onClose,
  targetAccount,
  meeting,
}) => {
  return (
    <>
      <Modal blockScrollOnMount={false} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Meeting scheduled</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction="column" p={12} pb={0}>
              <Image
                width="300px"
                src="/assets/calendar_success.svg"
                alt="Meeting scheduled"
              />
              {isOpen && meeting && (
                <Text
                  textAlign="center"
                  mt={12}
                >{`You meeting with ${getAccountDisplayName(
                  targetAccount
                )} at ${dayjs(meeting!.start).format(
                  'LLLL'
                )} was scheduled successfully.`}</Text>
              )}
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button m={4} onClick={onClose} variant="ghost">
              Schedule another
            </Button>
            <Button
              colorScheme="orange"
              mr={3}
              onClick={() => router.push('/dashboard')}
            >
              Go to dashboard
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default MeetingScheduledDialog
