import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Image,
  Input,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useState } from 'react'
import { FaBell } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { useLogin } from '@/session/login'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { MeetingDecrypted, SchedulingType } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import { setNotificationSubscriptions } from '@/utils/api_helper'
import { dateToHumanReadable } from '@/utils/calendar_manager'
import { getMeetingsScheduled } from '@/utils/storage'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'
import { isValidEmail } from '@/utils/validations'

import { Account } from '../../types/Account'

interface IProps {
  participants: ParticipantInfo[]
  schedulerAccount?: Account
  accountNotificationSubs: number
  meeting?: MeetingDecrypted
  scheduleType: SchedulingType
  reset: () => void
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  participants,
  schedulerAccount,
  accountNotificationSubs,
  meeting,
  scheduleType,
  reset,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const { handleLogin } = useLogin()

  const [emailSub, setEmailSub] = useState<string>()
  const [loadingSub, setLoadingSub] = useState<boolean>(false)

  const notificationsAlertBackground = useColorModeValue(
    'white',
    'rgba(47, 56, 71, 1)'
  )
  const notificationsAlertIconBackground = useColorModeValue(
    'gray.700',
    'gray.500'
  )

  let participantsToDisplay = []
  if (scheduleType === SchedulingType.GUEST) {
    participantsToDisplay =
      participants?.filter(participant => !participant.guest_email) ?? []
  } else {
    participantsToDisplay =
      participants?.filter(
        participant =>
          participant.account_address?.toLowerCase() !==
          schedulerAccount?.address.toLowerCase()
      ) ?? []
  }

  const accountMeetingsScheduled = schedulerAccount
    ? getMeetingsScheduled(schedulerAccount.address)
    : 0

  const subs = {
    account_address: currentAccount!.address,
    notification_types: [],
  } as AccountNotifications

  async function setReminder() {
    if (!emailSub || !isValidEmail(emailSub)) {
      return
    }

    setLoadingSub(true)

    subs.notification_types.push({
      channel: NotificationChannel.EMAIL,
      destination: emailSub,
      disabled: false,
    })

    await setNotificationSubscriptions(subs)

    logEvent('Set notifications', {
      channels: subs.notification_types.map(sub => sub.channel),
    })

    setLoadingSub(false)
  }

  return (
    <>
      <Flex
        direction="column"
        p={12}
        justify="center"
        bg={notificationsAlertBackground}
        borderRadius={6}
        gap={4}
        maxW="580px"
      >
        <Flex direction="column" px={12} justify="center" gap={4}>
          <Text fontSize="1.5rem" fontWeight={500} align="center">
            Success!
          </Text>
          {meeting?.start && (
            <Text textAlign="center">
              {`Your meeting with ${getAllParticipantsDisplayName(
                participantsToDisplay,
                schedulerAccount?.address
              )} at ${dateToHumanReadable(
                meeting!.start,
                Intl.DateTimeFormat().resolvedOptions().timeZone,
                false
              )} was scheduled successfully.`}
            </Text>
          )}
          <Image
            height="200px"
            src="/assets/calendar_success.svg"
            alt="Meeting scheduled"
          />
        </Flex>

        {schedulerAccount &&
        accountNotificationSubs === 0 &&
        accountMeetingsScheduled <= 3 &&
        currentAccount ? (
          <VStack gap={4}>
            <HStack
              borderRadius={6}
              bg={notificationsAlertIconBackground}
              width="100%"
              p={4}
            >
              <Icon as={FaBell} color="primary.300" />
              <Text color="primary.300">
                Set reminders so you don`t miss your meeting!
              </Text>
            </HStack>
            <Flex justify="start" direction="column" width="full">
              <FormControl>
                <FormLabel>Your Email</FormLabel>
                <HStack width="full">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={emailSub}
                    onChange={e => setEmailSub(e.target.value)}
                    disabled={loadingSub}
                  />
                  <Button
                    colorScheme="orangeButton"
                    px={8}
                    onClick={setReminder}
                    isLoading={loadingSub}
                    loadingText="Updating..."
                  >
                    Set Reminder
                  </Button>
                </HStack>
              </FormControl>
            </Flex>
          </VStack>
        ) : !!currentAccount ? (
          <Button
            colorScheme="orangeButton"
            onClick={() => router.push('/dashboard/calendars')}
          >
            Connect Calendar
          </Button>
        ) : (
          <>
            <Button colorScheme="orangeButton" onClick={() => handleLogin()}>
              Create Account
            </Button>
            <Button colorScheme="orangeButton" onClick={() => reset()}>
              Schedule Another
            </Button>
          </>
        )}
        {!!currentAccount ? (
          <>
            <Button
              colorScheme="orange"
              onClick={() => router.push('/dashboard/notifications')}
            >
              Go to Notification Settings
            </Button>
            <Link
              fontWeight={600}
              textAlign="center"
              onClick={() =>
                router.push(`/dashboard/meetings?slotId=${meeting?.id}`)
              }
            >
              View/Edit Meeting
            </Link>
          </>
        ) : null}
      </Flex>
    </>
  )
}

export default MeetingScheduledDialog
