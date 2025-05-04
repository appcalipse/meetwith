import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Image,
  Input,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import router from 'next/router'
import { useContext, useState } from 'react'
import { BiPlus } from 'react-icons/bi'
import { FaBell } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { MeetingDecrypted, SchedulingType } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  sendContactListInvite,
  setNotificationSubscriptions,
} from '@/utils/api_helper'
import { dateToHumanReadable } from '@/utils/calendar_manager'
import {
  CantInviteYourself,
  ContactAlreadyExists,
  ContactInviteAlreadySent,
} from '@/utils/errors'
import { getMeetingsScheduled } from '@/utils/storage'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'
import { isValidEmail } from '@/utils/validations'

import { Account } from '../../types/Account'

interface IProps {
  participants: ParticipantInfo[]
  hostAccount?: Account
  accountNotificationSubs: number
  meeting?: MeetingDecrypted
  scheduleType: SchedulingType
  hasConnectedCalendar: boolean
  reset: () => void
  isContact: boolean
  setIsContact: (isContact: boolean) => void
}

const MeetingScheduledDialog: React.FC<IProps> = ({
  participants,
  hostAccount,
  accountNotificationSubs,
  meeting,
  scheduleType,
  hasConnectedCalendar,
  isContact,
  setIsContact,
  reset,
}) => {
  const { currentAccount } = useContext(AccountContext)

  const toast = useToast()

  const { openConnection } = useContext(OnboardingModalContext)
  const { isLoading: isInviteLoading, mutateAsync: sendInviteAsync } =
    useMutation({
      mutationFn: (data: { address?: string }) =>
        sendContactListInvite(data?.address),
      mutationKey: ['sendContactListInvite'],
    })
  const handleInvite = async () => {
    try {
      if (!hostAccount?.address) return
      const invite = await sendInviteAsync({
        address: hostAccount.address,
      })
      if (invite?.success) {
        setIsContact(true)
        toast({
          title: 'Invitation sent successfully',
          description: '',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    } catch (e: unknown) {
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteAlreadySent) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof CantInviteYourself) {
        toast({
          title: 'Error',
          description: 'You can&apos;t invite yourself',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact invite request',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    }
  }
  const handleLogin = async () => {
    if (!currentAccount) {
      logEvent('Clicked to start on WHY section')
      openConnection()
    } else {
      await router.push('/dashboard')
    }
  }

  const [emailSub, setEmailSub] = useState<string>()
  const [loadingSub, setLoadingSub] = useState<boolean>(false)

  const notificationsAlertBackground = useColorModeValue('white', 'gray.800')
  const notificationsAlertIconBackground = useColorModeValue(
    'gray.300',
    'gray.700'
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
          currentAccount?.address.toLowerCase()
      ) ?? []
  }

  const accountMeetingsScheduled = currentAccount
    ? getMeetingsScheduled(currentAccount.address)
    : 0

  const subs = {
    account_address: currentAccount?.address,
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

    toast({
      title: 'Email notifications saved successfully!',
      status: 'success',
      duration: 5000,
      position: 'top',
      isClosable: true,
    })

    setLoadingSub(false)

    router.push('/dashboard/notifications')
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
                currentAccount?.address
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

        {currentAccount &&
        accountNotificationSubs === 0 &&
        accountMeetingsScheduled <= 3 &&
        !!currentAccount ? (
          <VStack gap={4}>
            <HStack
              borderRadius={6}
              bg={notificationsAlertIconBackground}
              width="100%"
              p={4}
            >
              <Icon as={FaBell} color="primary.300" />
              <Text>
                Set notifications so you don&apos;t miss your meeting!
              </Text>
            </HStack>
            <Flex justify="start" direction="column" width="full">
              <FormControl isInvalid={!isValidEmail(emailSub)}>
                <FormLabel>Your Email</FormLabel>
                <HStack width="full">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={emailSub}
                    onChange={e => setEmailSub(e.target.value)}
                    isDisabled={loadingSub}
                  />
                  <Button
                    colorScheme="primary"
                    px={8}
                    onClick={setReminder}
                    isLoading={loadingSub}
                    loadingText="Saving..."
                  >
                    Save email
                  </Button>
                </HStack>
              </FormControl>
            </Flex>
          </VStack>
        ) : !!currentAccount ? (
          <VStack gap={4}>
            {!isContact ? (
              <Button
                colorScheme="primary"
                width="100%"
                isLoading={isInviteLoading}
                onClick={() => handleInvite()}
              >
                <BiPlus size={24} style={{ marginRight: 4 }} />
                Add host to contact list
              </Button>
            ) : hasConnectedCalendar ? (
              <Button
                colorScheme="primary"
                onClick={() => router.push('/dashboard/notifications')}
                width="100%"
              >
                Go to Notifications
              </Button>
            ) : (
              <>
                <HStack
                  borderRadius={6}
                  bg={notificationsAlertIconBackground}
                  width="100%"
                  p={4}
                >
                  <Icon as={FaBell} color="primary.300" />
                  <Text>
                    Connect a calendar so you don&apos;t miss your next meeting!
                  </Text>
                </HStack>
                <Button
                  colorScheme="primary"
                  width="100%"
                  onClick={() => router.push('/dashboard/calendars')}
                >
                  Connect Calendar
                </Button>
              </>
            )}
            <Button
              variant="outline"
              colorScheme="primary"
              width="100%"
              onClick={() =>
                router.push(`/dashboard/meetings?slotId=${meeting?.id}`)
              }
            >
              View/Edit Meeting
            </Button>
          </VStack>
        ) : (
          <>
            <HStack
              borderRadius={6}
              bg={notificationsAlertIconBackground}
              width="100%"
              p={4}
            >
              <Icon as={FaBell} color="primary.300" />
              <Text color="primary.300">
                Finish setting up your free account for a more streamlined web3
                experience!
              </Text>
            </HStack>
            <Button
              colorScheme="primary"
              width="100%"
              onClick={() => handleLogin()}
            >
              Create Account
            </Button>
            <Button
              colorScheme="primary"
              variant="outline"
              width="100%"
              onClick={() => reset()}
            >
              Schedule Another
            </Button>
          </>
        )}
      </Flex>
    </>
  )
}

export default MeetingScheduledDialog
