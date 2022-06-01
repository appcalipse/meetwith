import {
  Button,
  Circle,
  Flex,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { format, utcToZonedTime } from 'date-fns-tz'
import router from 'next/router'
import { FaBell } from 'react-icons/fa'

import { Account } from '../../types/Account'
import { MeetingDecrypted } from '../../types/Meeting'
import { getMeetingsScheduled } from '../../utils/storage'
import { getAccountDisplayName } from '../../utils/user_manager'
import MWWButton from '../MWWButton'

interface IProps {
  isOpen: boolean
  onClose: () => void
  targetAccount: Account
  schedulerAccount: Account
  accountNotificationSubs: number
  meeting?: MeetingDecrypted
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  isOpen,
  onClose,
  targetAccount,
  schedulerAccount,
  accountNotificationSubs,
  meeting,
}) => {
  const notificationsAlertBackground = useColorModeValue('gray.100', 'gray.600')
  const notificationsAlertIconBackground = useColorModeValue(
    'gray.700',
    'gray.500'
  )
  const accountMeetingsScheduled = schedulerAccount
    ? getMeetingsScheduled(schedulerAccount.address)
    : 0

  return (
    <>
      <Modal
        blockScrollOnMount={false}
        size="lg"
        isOpen={isOpen}
        onClose={onClose}
      >
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
            {schedulerAccount &&
              accountNotificationSubs === 0 &&
              accountMeetingsScheduled <= 3 && (
                <HStack mt={12} p={3} bg={notificationsAlertBackground}>
                  <Circle
                    size="30px"
                    bg={notificationsAlertIconBackground}
                    mr="2"
                  >
                    <Icon as={FaBell} color="white" />
                  </Circle>
                  <Text fontSize="sm">
                    Make sure you don&apos;t miss your meetings by configuring
                    your notifications.
                  </Text>
                  <Button
                    colorScheme="orange"
                    variant="outline"
                    size="small"
                    p={2}
                    fontSize="xs"
                    onClick={() => router.push('/dashboard/notifications')}
                  >
                    Configure
                  </Button>
                </HStack>
              )}
          </ModalBody>
          <ModalFooter>
            <Button m={4} onClick={onClose} variant="ghost">
              Schedule another
            </Button>
            <MWWButton
              mr={3}
              onClick={() =>
                schedulerAccount ? router.push('/dashboard') : router.push('/')
              }
            >
              {schedulerAccount ? 'Go to dashboard' : 'Go home'}
            </MWWButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default MeetingScheduledDialog
