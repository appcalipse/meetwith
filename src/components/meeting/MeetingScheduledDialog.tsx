import {
  Button,
  Flex,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { format, utcToZonedTime } from 'date-fns-tz'
import router from 'next/router'

import { Account } from '../../types/Account'
import { MeetingDecrypted } from '../../types/Meeting'
import { getAccountDisplayName } from '../../utils/user_manager'
import MWWButton from '../MWWButton'

interface IProps {
  isOpen: boolean
  onClose: () => void
  targetAccount: Account
  schedulerAccount: Account
  meeting?: MeetingDecrypted
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  isOpen,
  onClose,
  targetAccount,
  schedulerAccount,
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
                >{`Your meeting with ${getAccountDisplayName(
                  targetAccount
                )} at ${format(
                  utcToZonedTime(
                    meeting!.start,
                    Intl.DateTimeFormat().resolvedOptions().timeZone
                  ),
                  'PPPpp'
                )} was scheduled successfully.`}</Text>
              )}
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button m={4} onClick={onClose} variant="ghost">
              Schedule another
            </Button>
            <MWWButton mr={3} onClick={() => router.push('/dashboard')}>
              {schedulerAccount ? 'Go to dashboard' : 'Go home'}
            </MWWButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default MeetingScheduledDialog
