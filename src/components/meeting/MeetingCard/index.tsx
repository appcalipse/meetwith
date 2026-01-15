import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Spinner,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { isAfter, isWithinInterval } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { useRouter } from 'next/router'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FaEdit, FaEllipsisV, FaRegCopy, FaTrash } from 'react-icons/fa'
import { MdCancel } from 'react-icons/md'
import sanitizeHtml from 'sanitize-html'

import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import { DeleteMeetingDialog } from '@/components/schedule/delete-dialog'
import ScheduleParticipantsSchedulerModal from '@/components/schedule/ScheduleParticipantsSchedulerModal'
import useClipboard from '@/hooks/useClipboard'
import { AccountContext } from '@/providers/AccountProvider'
import {
  DashBoardMwwEvents,
  isAccepted,
  isDeclined,
  isPendingAction,
} from '@/types/Calendar'
import { Intents } from '@/types/Dashboard'
import {
  ExtendedDBSlot,
  isSlotInstance,
  MeetingChangeType,
  MeetingDecrypted,
  MeetingRepeat,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  dateToLocalizedRange,
  decodeMeeting,
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
  rsvpMeeting,
} from '@/utils/calendar_manager'
import { appUrl, isProduction } from '@/utils/constants'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
} from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { useToastHelpers } from '@/utils/toasts'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface MeetingCardProps {
  meeting: DashBoardMwwEvents
  timezone: string
  updateParticipationStatus: (
    eventId: string,
    accountAddress: string,
    status: ParticipationStatus
  ) => void
  onCancel: (removed: string[], skipToast?: boolean) => Promise<void>
}
const getActor = (
  meeting?: MeetingDecrypted | null,
  currentAccountAddress?: string
) => {
  if (!meeting) return undefined
  return meeting.participants.find(
    participant => participant.account_address === currentAccountAddress
  )
}

interface Label {
  color: string
  text: string
}

export const defineLabel = (
  start: Date,
  end: Date,
  timezone: string
): Label | null => {
  try {
    const now = utcToZonedTime(new Date(), timezone)

    if (isWithinInterval(now, { start, end })) {
      return {
        color: 'yellow',
        text: 'Ongoing',
      }
    } else if (isAfter(now, end)) {
      return {
        color: 'gray',
        text: 'Ended',
      }
    }
  } catch (error) {
    console.error('Error defining label:', error)
  } finally {
    return null
  }
}
const MeetingCard = ({
  meeting,
  timezone,
  onCancel,
  updateParticipationStatus,
}: MeetingCardProps) => {
  const bgColor = useColorModeValue('white', 'neutral.900')

  const label = defineLabel(
    meeting.start as Date,
    meeting.end as Date,
    timezone
  )
  const toast = useToast()

  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isEditSchedulerOpen,
    onOpen: onEditSchedulerOpen,
    onClose: onEditSchedulerClose,
  } = useDisclosure()
  const { showSuccessToast, showInfoToast, showErrorToast } = useToastHelpers()

  const rsvpAbortControllerRef = useRef<AbortController | null>(null)

  const { copyFeedbackOpen, handleCopy } = useClipboard()
  const { push } = useRouter()
  const { currentAccount } = useContext(AccountContext)

  const [actor, setActor] = useState<ParticipantInfo | undefined>(
    getActor(meeting.decrypted, currentAccount?.address)
  )

  useEffect(() => {
    setActor(getActor(meeting.decrypted, currentAccount?.address))
  }, [meeting.decrypted, currentAccount])

  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const handleRSVP = async (status: ParticipationStatus) => {
    if (!actor || !currentAccount) return
    if (status === actor.status || !meeting.decrypted?.id) return
    const previousStatus = actor.status
    // cancel any in-flight rsvp request
    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    logEvent(`Clicked RSVP ${status} from Event Details PopOver`)

    try {
      setActor(prev => (prev ? { ...prev, status: status } : prev))

      await rsvpMeeting(
        meeting.id || meeting.decrypted.id,
        currentAccount.address,
        status,
        abortController.signal
      )
      updateParticipationStatus(
        meeting.id || meeting.decrypted.id,
        currentAccount.address,
        status
      )
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      // Revert status on error
      setActor(prev => (prev ? { ...prev, status: previousStatus } : prev))
      toast({
        title: 'RSVP Update Failed',
        description:
          'There was an error updating your RSVP status. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const downloadIcs = async (
    info: MeetingDecrypted,
    currentConnectedAccountAddress: string
  ) => {
    try {
      showInfoToast(
        'Downloading calendar invite',
        'Your download will begin shortly. Please check your downloads folder.'
      )
      const icsFile = await generateIcs(
        info,
        currentConnectedAccountAddress,
        MeetingChangeType.CREATE,
        `${appUrl}/dashboard/schedule?conferenceId=${meeting.decrypted?.meeting_id}&intent=${Intents.UPDATE_MEETING}`
      )

      const url = window.URL.createObjectURL(
        new Blob([icsFile.value!], { type: 'text/plain' })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `meeting_${meeting.decrypted.id}.ics`)

      document.body.appendChild(link)
      link.click()
      link.parentNode!.removeChild(link)
      showSuccessToast(
        'Downloaded calendar invite',
        'Ics file downloaded successfully'
      )
    } catch (_e) {
      showErrorToast(
        'Download failed',
        'There was an error downloading the ics file. Please try again.'
      )
    }
  }

  const getNamesDisplay = (
    meeting: MeetingDecrypted,
    canSeeGuestList: boolean
  ) => {
    return getAllParticipantsDisplayName(
      meeting.participants,
      currentAccount!.address,
      canSeeGuestList
    )
  }
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    meeting.decrypted?.participants,
    currentAccount?.address
  )

  const menuItems = useMemo(
    () => [
      {
        label: 'Add to Google Calendar',
        onClick: async () => {
          showInfoToast(
            'Opening Google Calendar',
            'A new tab will open with your Google Calendar invite.'
          )
          const url = await generateGoogleCalendarUrl(
            meeting.decrypted?.meeting_id || '',
            currentAccount!.address,
            meeting.decrypted?.start,
            meeting.decrypted?.end,
            meeting.decrypted?.title || 'No Title',
            meeting.decrypted?.content,
            meeting.decrypted?.meeting_url,
            timezone,
            meeting.decrypted?.participants,
            meeting.recurrence
          )
          showSuccessToast(
            'Opening Link',
            'A new tab has been opened with your Google Calendar invite.'
          )
          window.open(url, '_blank', 'noopener noreferrer')
        },
      },
      {
        label: 'Add to Office 365 Calendar',
        onClick: async () => {
          showInfoToast(
            'Generating Link',
            'A new tab will open with your Office 365 calendar invite.'
          )
          const url = await generateOffice365CalendarUrl(
            meeting.decrypted?.meeting_id || '',
            currentAccount!.address,
            meeting.decrypted?.start,
            meeting.decrypted?.end,
            meeting.decrypted?.title || 'No Title',
            meeting.decrypted?.content,
            meeting.decrypted?.meeting_url,
            timezone,
            meeting.decrypted?.participants
          )
          showSuccessToast(
            'Opening Link',
            'A new tab has been opened with your Office 365 calendar invite.'
          )
          window.open(url, '_blank', 'noopener noreferrer')
        },
      },
      {
        label: 'Download calendar invite',
        isAsync: true,
        onClick: () => {
          downloadIcs(meeting.decrypted!, currentAccount!.address)
        },
      },
    ],
    [meeting.decrypted, currentAccount, timezone]
  )

  const handleDelete = () => {
    if (
      isAccountSchedulerOrOwner(
        meeting.decrypted?.participants,
        currentAccount?.address,
        [ParticipantType.Scheduler]
      )
    ) {
      onEditSchedulerOpen()
    } else {
      onDeleteOpen()
    }
  }
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const isRecurring =
    meeting?.decrypted.recurrence &&
    meeting?.decrypted.recurrence !== MeetingRepeat.NO_REPEAT
  const canSeeGuestList = canAccountAccessPermission(
    meeting.decrypted?.permissions,
    meeting.decrypted?.participants || [],
    currentAccount?.address,
    MeetingPermissions.SEE_GUEST_LIST
  )
  const handleEditMeeting = async () => {
    if (meeting.decrypted) {
      try {
        let url = `/dashboard/schedule?meetingId=${meeting.id}&intent=${Intents.UPDATE_MEETING}`
        if (isSlotInstance(meeting)) {
          url += `&seriesId=${meeting.series_id}`
        }
        await push(url)
      } catch (_: unknown) {
        toast({
          title: 'Navigation Error',
          description: 'Failed to navigate to edit page.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } else {
      toast({
        title: 'Meeting Data Unavailable',
        description: 'Unable to edit this meeting.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <>
      <Box
        bgColor={bgColor}
        borderRadius="lg"
        mt={3}
        position="relative"
        pt={{
          base: label || isRecurring ? 4 : 0,
        }}
        shadow="sm"
        width="100%"
      >
        <HStack
          display={label || isRecurring ? 'flex' : 'none'}
          position="absolute"
          right={0}
          top={0}
        >
          {label && (
            <Badge
              alignSelf="flex-end"
              borderBottomRightRadius={4}
              borderRadius={0}
              colorScheme={label.color}
              px={2}
              py={1}
            >
              {label.text}
            </Badge>
          )}
          {isRecurring && (
            <Badge
              alignSelf="flex-end"
              borderBottomRightRadius={4}
              borderRadius={0}
              colorScheme={'gray'}
              px={2}
              py={1}
            >
              Recurrence: {meeting?.decrypted?.recurrence}
            </Badge>
          )}
        </HStack>
        <Box maxWidth="100%" p={6} pt={isRecurring ? 8 : 6}>
          <VStack alignItems="start" gap={6} position="relative">
            <Flex
              alignItems="start"
              flexDirection={{
                base: 'column-reverse',
                md: 'row',
              }}
              flexWrap="wrap"
              gap={4}
              w="100%"
            >
              <VStack alignItems="start" flex={1}>
                <Flex alignItems="center" flex={1} gap={3}>
                  <Heading fontSize="24px">
                    <strong>{meeting.decrypted?.title || 'No Title'}</strong>
                  </Heading>
                </Flex>
                <Text alignItems="start" fontSize="16px">
                  <strong>
                    {dateToLocalizedRange(
                      meeting.start as Date,
                      meeting.end as Date,
                      timezone,
                      true
                    )}
                  </strong>
                </Text>
              </VStack>

              <HStack
                ml={{
                  base: 'auto',
                  md: 0,
                }}
              >
                <Link
                  _hover={{
                    textDecoration: 'none',
                  }}
                  flex={1}
                  href={addUTMParams(meeting.decrypted?.meeting_url || '')}
                  isExternal
                  maxWidth="100%"
                  onClick={() => logEvent('Joined a meeting')}
                  overflow="hidden"
                  textDecoration="none"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  <Button colorScheme="primary">Join meeting</Button>
                </Link>
                <Tooltip label="Edit meeting" placement="top">
                  <IconButton
                    aria-label="edit"
                    color={iconColor}
                    icon={<FaEdit size={16} />}
                    onClick={handleEditMeeting}
                  />
                </Tooltip>
                {isSchedulerOrOwner && (
                  <Tooltip label="Cancel meeting for everyone" placement="top">
                    <IconButton
                      aria-label="remove"
                      color={iconColor}
                      icon={<MdCancel size={16} />}
                      onClick={onCancelOpen}
                    />
                  </Tooltip>
                )}
                <Tooltip label="Delete meeting" placement="top">
                  <IconButton
                    aria-label="delete"
                    color={iconColor}
                    icon={<FaTrash size={16} />}
                    onClick={handleDelete}
                  />
                </Tooltip>
                <Menu>
                  <MenuButton
                    aria-label="option"
                    as={IconButton}
                    color={iconColor}
                    icon={<FaEllipsisV size={16} />}
                    key={`${meeting?.id}-option`}
                  />
                  <Portal>
                    <MenuList backgroundColor={menuBgColor}>
                      {menuItems.map((val, index, arr) => [
                        <MenuItem
                          aria-busy
                          backgroundColor={menuBgColor}
                          key={`${val.label}-${meeting?.id}`}
                          onClick={val.onClick}
                        >
                          {val.label}
                        </MenuItem>,
                        index !== arr.length - 1 && (
                          <MenuDivider
                            borderColor="neutral.600"
                            key={`divider-${index}-${meeting?.id}`}
                          />
                        ),
                      ])}
                      {!isProduction && (
                        <>
                          <MenuDivider
                            borderColor="neutral.600"
                            key="divider2"
                          />
                          <MenuItem
                            backgroundColor={menuBgColor}
                            key="log-info"
                            onClick={() => console.debug(meeting.decrypted)}
                          >
                            Log info (for debugging)
                          </MenuItem>
                        </>
                      )}
                    </MenuList>
                  </Portal>
                </Menu>
              </HStack>
            </Flex>

            <Divider />
            <VStack alignItems="start" maxWidth="100%">
              <HStack alignItems="flex-start" maxWidth="100%">
                <Text display="inline" whiteSpace="balance" width="100%">
                  <strong>Participants: </strong>
                  {getNamesDisplay(meeting.decrypted, canSeeGuestList)}
                </Text>
              </HStack>
              <HStack
                alignItems="flex-start"
                flexWrap="wrap"
                gap={2}
                maxWidth="100%"
                width="100%"
              >
                <Text fontWeight={700} whiteSpace="nowrap">
                  Meeting link:
                </Text>
                <Flex flex={1} overflow="hidden">
                  <Link
                    href={addUTMParams(meeting.decrypted.meeting_url || '')}
                    isExternal
                    onClick={() => logEvent('Clicked to start meeting')}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {meeting.decrypted.meeting_url}
                  </Link>
                  <Tooltip
                    isOpen={copyFeedbackOpen}
                    label="Link copied"
                    placement="top"
                  >
                    <Button
                      colorScheme="primary"
                      leftIcon={
                        <FaRegCopy cursor="pointer" display="block" size={16} />
                      }
                      onClick={() =>
                        handleCopy(meeting.decrypted.meeting_url || '')
                      }
                      variant="link"
                      w={4}
                    />
                  </Tooltip>
                </Flex>
              </HStack>
              {meeting.decrypted.content && (
                <HStack alignItems="flex-start" flexWrap="wrap">
                  <Text>
                    <strong>Description:</strong>
                  </Text>
                  <Text
                    className="rich-text-wrapper"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(meeting.decrypted.content, {
                        allowedAttributes: false,
                        allowVulnerableTags: false,
                      }),
                    }}
                    suppressHydrationWarning
                    whiteSpace="pre-wrap"
                    width="100%"
                    wordBreak="break-word"
                  />
                </HStack>
              )}
            </VStack>
            <HStack alignItems="center" gap={3.5}>
              <Text fontWeight={700}>RSVP:</Text>
              <HStack alignItems="center" gap={2}>
                <Tag
                  bg={isAccepted(actor?.status) ? 'green.500' : 'transparent'}
                  borderColor={'green.500'}
                  borderWidth={1}
                  cursor="pointer"
                  fontSize={{
                    lg: '16px',
                    md: '14px',
                    base: '12px',
                  }}
                  onClick={() => handleRSVP(ParticipationStatus.Accepted)}
                  px={3}
                  rounded="full"
                >
                  <TagLabel
                    color={isAccepted(actor?.status) ? 'white' : 'green.500'}
                  >
                    Yes
                  </TagLabel>
                </Tag>
                <Tag
                  bg={isDeclined(actor?.status) ? 'red.250' : 'transparent'}
                  borderColor={'red.250'}
                  borderWidth={1}
                  cursor="pointer"
                  fontSize={{
                    lg: '16px',
                    md: '14px',
                    base: '12px',
                  }}
                  onClick={() => handleRSVP(ParticipationStatus.Rejected)}
                  px={3}
                  rounded="full"
                >
                  <TagLabel
                    color={isDeclined(actor?.status) ? 'white' : 'red.250'}
                  >
                    No
                  </TagLabel>
                </Tag>
                <Tag
                  bg={
                    isPendingAction(actor?.status)
                      ? 'primary.300'
                      : 'transparent'
                  }
                  borderColor={'primary.300'}
                  borderWidth={1}
                  cursor="pointer"
                  fontSize={{
                    lg: '16px',
                    md: '14px',
                    base: '12px',
                  }}
                  onClick={() => handleRSVP(ParticipationStatus.Pending)}
                  px={3}
                  rounded="full"
                >
                  <TagLabel
                    color={
                      isPendingAction(actor?.status) ? 'white' : 'primary.300'
                    }
                  >
                    Maybe
                  </TagLabel>
                </Tag>
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </Box>

      <ScheduleParticipantsSchedulerModal
        decryptedMeeting={meeting.decrypted}
        isOpen={isEditSchedulerOpen}
        onClose={onEditSchedulerClose}
        participants={meeting.decrypted?.participants || []}
      />
      <DeleteMeetingDialog
        afterCancel={onCancel}
        currentAccount={currentAccount}
        decryptedMeeting={meeting.decrypted}
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
      />
      <CancelMeetingDialog
        afterCancel={onCancel}
        currentAccount={currentAccount}
        decryptedMeeting={meeting.decrypted}
        isOpen={isCancelOpen}
        onClose={onCancelClose}
      />
    </>
  )
}

export default MeetingCard
