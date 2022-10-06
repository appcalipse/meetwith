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
import router from 'next/router'
import { FaBell } from 'react-icons/fa'

import {
  MeetingDecrypted,
  ParticipantInfo,
  SchedulingType,
} from '@/types/Meeting'
import { dateToHumanReadable } from '@/utils/calendar_manager'
import { getMeetingsScheduled } from '@/utils/storage'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

import { Account } from '../../types/Account'
import MWWButton from '../MWWButton'

interface IProps {
  isOpen: boolean
  onClose: () => void
  participants: ParticipantInfo[]
  schedulerAccount?: Account
  accountNotificationSubs: number
  meeting?: MeetingDecrypted
  scheduleType: SchedulingType
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  isOpen,
  onClose,
  participants,
  schedulerAccount,
  accountNotificationSubs,
  meeting,
  scheduleType,
}) => {
  const notificationsAlertBackground = useColorModeValue('gray.100', 'gray.600')
  const notificationsAlertIconBackground = useColorModeValue(
    'gray.700',
    'gray.500'
  )

  let participantsToDisplay = []
  if (scheduleType === SchedulingType.GUEST) {
    participantsToDisplay = participants.filter(
      participant => !participant.guest_email
    )
  } else {
    participantsToDisplay = participants.filter(
      participant =>
        participant.account_address?.toLowerCase() !==
        schedulerAccount?.address.toLowerCase()
    )
  }

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
                >{`Your meeting with ${getAllParticipantsDisplayName(
                  participantsToDisplay,
                  schedulerAccount?.address
                )} at ${dateToHumanReadable(
                  meeting!.start,
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                  false
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
