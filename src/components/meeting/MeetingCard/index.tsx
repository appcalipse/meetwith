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
import { useContext, useEffect, useMemo, useState } from 'react'
import React from 'react'
import { FaEdit, FaEllipsisV, FaRegCopy, FaTrash } from 'react-icons/fa'
import sanitizeHtml from 'sanitize-html'

import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import { AccountContext } from '@/providers/AccountProvider'
import { Intents } from '@/types/Dashboard'
import {
  DBSlot,
  MeetingChangeType,
  MeetingDecrypted,
  MeetingRepeat,
} from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  dateToLocalizedRange,
  decodeMeeting,
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
} from '@/utils/calendar_manager'
import { appUrl, isProduction } from '@/utils/constants'
import { addUTMParams } from '@/utils/huddle.helper'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface MeetingCardProps {
  meeting: DBSlot
  timezone: string
  onCancel: (removed: string[]) => void
  onClickToOpen: (
    meeting: DBSlot,
    decryptedMeeting: MeetingDecrypted,
    timezone: string
  ) => void
}

interface Label {
  color: string
  text: string
}

const LIMIT_DATE_TO_SHOW_UPDATE = new Date('2022-10-21')

const MeetingCard = ({ meeting, timezone, onCancel }: MeetingCardProps) => {
  const defineLabel = (start: Date, end: Date): Label | null => {
    const now = utcToZonedTime(new Date(), timezone)
    console.log({ start, end, now })
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
    return null
  }

  const bgColor = useColorModeValue('white', 'neutral.900')

  const label = defineLabel(meeting.start as Date, meeting.end as Date)
  const toast = useToast()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const [decryptedMeeting, setDecryptedMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [loading, setLoading] = useState(true)
  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)
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

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const downloadIcs = (
    info: MeetingDecrypted,
    currentConnectedAccountAddress: string
  ) => {
    const icsFile = generateIcs(
      info,
      currentConnectedAccountAddress,
      MeetingChangeType.CREATE,
      `${appUrl}/dashboard/meetings?slotId=${info.id}`
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
  }

  const getNamesDisplay = (meeting: MeetingDecrypted) => {
    return getAllParticipantsDisplayName(
      meeting.participants,
      currentAccount!.address
    )
  }

  const menuItems = useMemo(
    () => [
      {
        label: 'Add to Google Calendar',
        link: generateGoogleCalendarUrl(
          decryptedMeeting?.start,
          decryptedMeeting?.end,
          decryptedMeeting?.title || 'No Title',
          decryptedMeeting?.content,
          decryptedMeeting?.meeting_url,
          timezone,
          decryptedMeeting?.participants
        ),
      },
      {
        label: 'Add to Office 365 Calendar',
        link: generateOffice365CalendarUrl(
          decryptedMeeting?.start,
          decryptedMeeting?.end,
          decryptedMeeting?.title || 'No Title',
          decryptedMeeting?.content,
          decryptedMeeting?.meeting_url,
          timezone,
          decryptedMeeting?.participants
        ),
      },
      {
        label: 'Download. ics ',
        onClick: () => {
          downloadIcs(decryptedMeeting!, currentAccount!.address)
        },
      },
    ],
    [decryptedMeeting, currentAccount, timezone]
  )
  const handleCopy = async () => {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(decryptedMeeting?.meeting_url || '')
      } else {
        document.execCommand('copy', true, decryptedMeeting?.meeting_url || '')
      }
    } catch (err) {
      document.execCommand('copy', true, decryptedMeeting?.meeting_url || '')
    }
    logEvent('Copied link', { url: decryptedMeeting?.meeting_url || '' })
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 2000)
  }
  const showEdit =
    isAfter(meeting.created_at!, LIMIT_DATE_TO_SHOW_UPDATE) &&
    isAfter(meeting.start, new Date())
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const isRecurring =
    meeting?.recurrence && meeting?.recurrence !== MeetingRepeat.NO_REPEAT
  return (
    <>
      {loading ? (
        <HStack>
          <Text>Decoding meeting info...</Text>{' '}
          <Spinner size="sm" colorScheme="gray" />
        </HStack>
      ) : decryptedMeeting ? (
        <Box
          shadow="md"
          width="100%"
          borderRadius="lg"
          position="relative"
          bgColor={bgColor}
          pt={{
            base: label ? 3 : 0,
            md: label ? 1.5 : 0,
          }}
        >
          {label ? (
            <Badge
              borderRadius={0}
              borderBottomRightRadius={4}
              px={2}
              py={1}
              colorScheme={label.color}
              alignSelf="flex-end"
              position="absolute"
              left={0}
              top={0}
            >
              {label.text}
            </Badge>
          ) : (
            isRecurring && (
              <Badge
                borderRadius={0}
                borderBottomRightRadius={4}
                px={2}
                py={1}
                colorScheme={'gray'}
                alignSelf="flex-end"
                position="absolute"
                right={0}
                top={0}
              >
                Recurrence: {meeting?.recurrence}
              </Badge>
            )
          )}
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
                      <strong>{decryptedMeeting?.title || 'No Title'}</strong>
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
                  <>
                    {showEdit && (
                      <>
                        <IconButton
                          color={iconColor}
                          aria-label="edit"
                          icon={<FaEdit size={16} />}
                          onClick={() => {
                            if (decryptedMeeting)
                              void push(
                                `/dashboard/schedule?meetingId=${meeting.id}&intent=${Intents.UPDATE_MEETING}`
                              )
                          }}
                        />
                        <IconButton
                          color={iconColor}
                          aria-label="remove"
                          icon={<FaTrash size={16} />}
                          onClick={onOpen}
                        />
                      </>
                    )}
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
                            val.link ? (
                              <MenuItem
                                as="a"
                                href={val.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                key={`${val.label}-${meeting?.id}`}
                                backgroundColor={menuBgColor}
                              >
                                {val.label}
                              </MenuItem>
                            ) : (
                              <MenuItem
                                onClick={val.onClick}
                                backgroundColor={menuBgColor}
                                key={`${val.label}-${meeting?.id}`}
                              >
                                {val.label}
                              </MenuItem>
                            ),
                            index !== arr.length - 1 && (
                              <MenuDivider
                                key="divider"
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
                  </>
                </HStack>
              </Flex>

              <Divider />
              <VStack alignItems="start" maxWidth="100%">
                <HStack alignItems="flex-start" maxWidth="100%">
                  <Text display="inline" width="100%" whiteSpace="balance">
                    <strong>Participants: </strong>
                    {getNamesDisplay(decryptedMeeting)}
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
                        onClick={handleCopy}
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
              </VStack>
            </VStack>
          </Box>
        </Box>
      ) : (
        <HStack>
          <Text>Failed to decode information</Text>
        </HStack>
      )}
      <CancelMeetingDialog
        isOpen={isOpen}
        onClose={onClose}
        decriptedMeeting={decryptedMeeting}
        currentAccount={currentAccount}
        afterCancel={onCancel}
      />
    </>
  )
}

export default MeetingCard
