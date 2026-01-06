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
import { isAccepted, isDeclined, isPendingAction } from '@/types/Calendar'
import { Intents } from '@/types/Dashboard'
import {
  ExtendedDBSlot,
  MeetingChangeType,
  MeetingDecrypted,
  MeetingRepeat,
} from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
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
  meeting: ExtendedDBSlot
  timezone: string
  onCancel: (removed: string[], skipToast?: boolean) => Promise<void>
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
const MeetingCard = ({ meeting, timezone, onCancel }: MeetingCardProps) => {
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

  const [decryptedMeeting, setDecryptedMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [loading, setLoading] = useState(true)
  const rsvpAbortControllerRef = useRef<AbortController | null>(null)

  const { copyFeedbackOpen, handleCopy } = useClipboard()
  const { push } = useRouter()
  const { currentAccount } = useContext(AccountContext)
  const decodeData = async () => {
    const decodedMeeting = await decodeMeeting(meeting, currentAccount!)

    if (decodedMeeting) {
      setDecryptedMeeting(decodedMeeting)
    } else {
      toast({
        title: 'Something went wrong',
        description: 'Unable to decode meeting data.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    decodeData()
  }, [meeting])
  const actor = useMemo(() => {
    if (!decryptedMeeting) return undefined
    return decryptedMeeting.participants.find(
      participant => participant.account_address === currentAccount?.address
    )
  }, [decodeData, currentAccount])
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const handleRSVP = async (status: ParticipationStatus) => {
    if (!actor || !currentAccount) return
    if (status === actor.status || !decryptedMeeting?.id) return
    // cancel any in-flight rsvp request
    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    logEvent(`Clicked RSVP ${status} from Event Details PopOver`)

    try {
      await rsvpMeeting(
        decryptedMeeting!.id,
        currentAccount.address,
        status,
        abortController.signal
      )
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
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
        `${appUrl}/dashboard/schedule?conferenceId=${meeting.conferenceData?.id}&intent=${Intents.UPDATE_MEETING}`
      )

      const url = window.URL.createObjectURL(
        new Blob([icsFile.value!], { type: 'text/plain' })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `meeting_${decryptedMeeting!.id}.ics`)

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
    decryptedMeeting?.participants,
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
            decryptedMeeting?.meeting_id || '',
            currentAccount!.address,
            decryptedMeeting?.start,
            decryptedMeeting?.end,
            decryptedMeeting?.title || 'No Title',
            decryptedMeeting?.content,
            decryptedMeeting?.meeting_url,
            timezone,
            decryptedMeeting?.participants,
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
            decryptedMeeting?.meeting_id || '',
            currentAccount!.address,
            decryptedMeeting?.start,
            decryptedMeeting?.end,
            decryptedMeeting?.title || 'No Title',
            decryptedMeeting?.content,
            decryptedMeeting?.meeting_url,
            timezone,
            decryptedMeeting?.participants
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
          downloadIcs(decryptedMeeting!, currentAccount!.address)
        },
      },
    ],
    [decryptedMeeting, currentAccount, timezone]
  )

  const handleDelete = () => {
    if (
      isAccountSchedulerOrOwner(
        decryptedMeeting?.participants,
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
    meeting?.recurrence && meeting?.recurrence !== MeetingRepeat.NO_REPEAT
  const canSeeGuestList = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants || [],
    currentAccount?.address,
    MeetingPermissions.SEE_GUEST_LIST
  )
  const handleEditMeeting = async () => {
    if (decryptedMeeting) {
      try {
        await push(
          `/dashboard/schedule?meetingId=${
            meeting.id?.split('_')?.[0]
          }&intent=${Intents.UPDATE_MEETING}`
        )
      } catch (error) {
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
      {loading ? (
        <HStack mt={3}>
          <Text>Decoding meeting info...</Text>{' '}
          <Spinner size="sm" colorScheme="gray" />
        </HStack>
      ) : decryptedMeeting ? (
        <Box
          shadow="sm"
          width="100%"
          borderRadius="lg"
          position="relative"
          mt={3}
          bgColor={bgColor}
          pt={{
            base: label ? 3 : 0,
            md: label ? 1.5 : 0,
          }}
        >
          <HStack
            position="absolute"
            right={0}
            top={0}
            display={label || isRecurring ? 'flex' : 'none'}
          >
            {label && (
              <Badge
                borderRadius={0}
                borderBottomRightRadius={4}
                px={2}
                py={1}
                colorScheme={label.color}
                alignSelf="flex-end"
              >
                {label.text}
              </Badge>
            )}
            {isRecurring && (
              <Badge
                borderRadius={0}
                borderBottomRightRadius={4}
                px={2}
                py={1}
                colorScheme={'gray'}
                alignSelf="flex-end"
              >
                Recurrence: {meeting?.recurrence}
              </Badge>
            )}
          </HStack>
          <Box p={6} pt={isRecurring ? 8 : 6} maxWidth="100%">
            <VStack alignItems="start" position="relative" gap={6}>
              <Flex
                alignItems="start"
                w="100%"
                flexDirection={{
                  base: 'column-reverse',
                  md: 'row',
                }}
                gap={4}
                flexWrap="wrap"
              >
                <VStack flex={1} alignItems="start">
                  <Flex flex={1} alignItems="center" gap={3}>
                    <Heading fontSize="24px">
                      <strong>
                        {meeting.conferenceData?.title ||
                          decryptedMeeting?.title ||
                          'No Title'}
                      </strong>
                    </Heading>
                  </Flex>
                  <Text fontSize="16px" alignItems="start">
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
                    href={addUTMParams(decryptedMeeting?.meeting_url || '')}
                    isExternal
                    onClick={() => logEvent('Joined a meeting')}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    maxWidth="100%"
                    textDecoration="none"
                    flex={1}
                    _hover={{
                      textDecoration: 'none',
                    }}
                  >
                    <Button colorScheme="primary">Join meeting</Button>
                  </Link>
                  <Tooltip label="Edit meeting" placement="top">
                    <IconButton
                      color={iconColor}
                      aria-label="edit"
                      icon={<FaEdit size={16} />}
                      onClick={handleEditMeeting}
                    />
                  </Tooltip>
                  {isSchedulerOrOwner && (
                    <Tooltip
                      label="Cancel meeting for everyone"
                      placement="top"
                    >
                      <IconButton
                        color={iconColor}
                        aria-label="remove"
                        icon={<MdCancel size={16} />}
                        onClick={onCancelOpen}
                      />
                    </Tooltip>
                  )}
                  <Tooltip label="Delete meeting" placement="top">
                    <IconButton
                      color={iconColor}
                      aria-label="delete"
                      icon={<FaTrash size={16} />}
                      onClick={handleDelete}
                    />
                  </Tooltip>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      color={iconColor}
                      aria-label="option"
                      icon={<FaEllipsisV size={16} />}
                      key={`${meeting?.id}-option`}
                    />
                    <Portal>
                      <MenuList backgroundColor={menuBgColor}>
                        {menuItems.map((val, index, arr) => [
                          <MenuItem
                            onClick={val.onClick}
                            backgroundColor={menuBgColor}
                            key={`${val.label}-${meeting?.id}`}
                            aria-busy
                          >
                            {val.label}
                          </MenuItem>,
                          index !== arr.length - 1 && (
                            <MenuDivider
                              key={`divider-${index}-${meeting?.id}`}
                              borderColor="neutral.600"
                            />
                          ),
                        ])}
                        {!isProduction && (
                          <>
                            <MenuDivider
                              key="divider2"
                              borderColor="neutral.600"
                            />
                            <MenuItem
                              key="log-info"
                              backgroundColor={menuBgColor}
                              onClick={() => console.debug(decryptedMeeting)}
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
                  <Text display="inline" width="100%" whiteSpace="balance">
                    <strong>Participants: </strong>
                    {getNamesDisplay(decryptedMeeting, canSeeGuestList)}
                  </Text>
                </HStack>
                <HStack
                  alignItems="flex-start"
                  maxWidth="100%"
                  flexWrap="wrap"
                  gap={2}
                  width="100%"
                >
                  <Text whiteSpace="nowrap" fontWeight={700}>
                    Meeting link:
                  </Text>
                  <Flex flex={1} overflow="hidden">
                    <Link
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      href={addUTMParams(decryptedMeeting.meeting_url || '')}
                      isExternal
                      onClick={() => logEvent('Clicked to start meeting')}
                    >
                      {decryptedMeeting.meeting_url}
                    </Link>
                    <Tooltip
                      label="Link copied"
                      placement="top"
                      isOpen={copyFeedbackOpen}
                    >
                      <Button
                        w={4}
                        colorScheme="primary"
                        variant="link"
                        onClick={() =>
                          handleCopy(decryptedMeeting.meeting_url || '')
                        }
                        leftIcon={<FaRegCopy />}
                      />

                      {/* <FaRegCopy size={16} display="block" cursor="pointer" /> */}
                    </Tooltip>
                  </Flex>
                </HStack>
                {decryptedMeeting.content && (
                  <HStack alignItems="flex-start" flexWrap="wrap">
                    <Text>
                      <strong>Description:</strong>
                    </Text>
                    <Text
                      width="100%"
                      wordBreak="break-word"
                      whiteSpace="pre-wrap"
                      suppressHydrationWarning
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(decryptedMeeting.content, {
                          allowedAttributes: false,
                          allowVulnerableTags: false,
                        }),
                      }}
                    />
                  </HStack>
                )}
                <HStack alignItems="center" gap={3.5} display="none">
                  <Text fontWeight={700}>RSVP:</Text>
                  <HStack alignItems="center" gap={2}>
                    <Tag
                      bg={
                        isAccepted(actor?.status) ? 'green.500' : 'transparent'
                      }
                      borderWidth={1}
                      borderColor={'green.500'}
                      rounded="full"
                      px={3}
                      fontSize={{
                        lg: '16px',
                        md: '14px',
                        base: '12px',
                      }}
                      onClick={() => handleRSVP(ParticipationStatus.Accepted)}
                    >
                      <TagLabel
                        color={
                          isAccepted(actor?.status) ? 'white' : 'green.500'
                        }
                      >
                        Yes
                      </TagLabel>
                    </Tag>
                    <Tag
                      bg={isDeclined(actor?.status) ? 'red.250' : 'transparent'}
                      borderWidth={1}
                      borderColor={'red.250'}
                      rounded="full"
                      px={3}
                      fontSize={{
                        lg: '16px',
                        md: '14px',
                        base: '12px',
                      }}
                      onClick={() => handleRSVP(ParticipationStatus.Rejected)}
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
                      borderWidth={1}
                      borderColor={'primary.300'}
                      rounded="full"
                      px={3}
                      fontSize={{
                        lg: '16px',
                        md: '14px',
                        base: '12px',
                      }}
                      onClick={() => handleRSVP(ParticipationStatus.Pending)}
                    >
                      <TagLabel
                        color={
                          isPendingAction(actor?.status)
                            ? 'white'
                            : 'primary.300'
                        }
                      >
                        Maybe
                      </TagLabel>
                    </Tag>
                  </HStack>
                </HStack>
              </VStack>
            </VStack>
          </Box>
        </Box>
      ) : (
        <HStack>
          <Text>Failed to decode information</Text>
        </HStack>
      )}

      <ScheduleParticipantsSchedulerModal
        isOpen={isEditSchedulerOpen}
        onClose={onEditSchedulerClose}
        participants={decryptedMeeting?.participants || []}
        decryptedMeeting={decryptedMeeting}
      />
      <DeleteMeetingDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        decryptedMeeting={decryptedMeeting}
        currentAccount={currentAccount}
        afterCancel={onCancel}
      />
      <CancelMeetingDialog
        isOpen={isCancelOpen}
        onClose={onCancelClose}
        decryptedMeeting={decryptedMeeting}
        currentAccount={currentAccount}
        afterCancel={onCancel}
      />
    </>
  )
}

export default MeetingCard
