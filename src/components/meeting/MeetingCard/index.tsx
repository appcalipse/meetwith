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
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { addHours, isAfter, isWithinInterval } from 'date-fns'
import { useContext, useEffect, useMemo, useState } from 'react'
import React from 'react'
import { FaEdit, FaEllipsisV, FaRegCopy, FaTrash } from 'react-icons/fa'
import sanitizeHtml from 'sanitize-html'

import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
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

import { AccountContext } from '../../../providers/AccountProvider'
import {
  DBSlot,
  MeetingChangeType,
  MeetingDecrypted,
} from '../../../types/Meeting'
import { logEvent } from '../../../utils/analytics'

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

const MeetingCard = ({
  meeting,
  timezone,
  onCancel,
  onClickToOpen,
}: MeetingCardProps) => {
  const defineLabel = (start: Date, end: Date): Label | null => {
    const now = new Date()
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
    } else if (isAfter(addHours(now, 6), start)) {
      return {
        color: 'green',
        text: 'Starting Soon',
      }
    }
    return null
  }

  const bgColor = useColorModeValue('white', '#1F2933')

  const label = defineLabel(meeting.start as Date, meeting.end as Date)
  const toast = useToast()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const [decryptedMeeting, setDecryptedMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [loading, setLoading] = useState(true)

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
          decryptedMeeting?.title,
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
          decryptedMeeting?.title,
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
      {
        label: 'Open Meeting Private Data',
        link: `https://mww.infura-ipfs.io/ipfs/${meeting.meeting_info_file_path}`,
      },
    ],
    [meeting]
  )
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(decryptedMeeting?.meeting_url || '')
      toast({
        title: 'Copied to clipboard',
        status: 'success',
        duration: 2000,
        position: 'top',
      })
    } catch (e) {
      toast({
        title: 'Failed to copy to clipboard',
        status: 'error',
        duration: 2000,
        position: 'top',
      })
    }
  }
  const showEdit =
    isAfter(meeting.created_at!, LIMIT_DATE_TO_SHOW_UPDATE) &&
    isAfter(meeting.start, new Date())
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
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
          overflow="hidden"
          position="relative"
          bgColor={bgColor}
        >
          <Box p="8" maxWidth="100%">
            <VStack alignItems="start" position="relative" gap={6}>
              <Flex alignItems="center" w="100%" mt={2}>
                <Flex flex={1} alignItems="center" gap={3}>
                  <Heading size="lg">
                    <strong>{decryptedMeeting?.title}</strong>
                  </Heading>
                  {label && (
                    <Badge
                      borderRadius={3}
                      borderBottomRightRadius={4}
                      px={2}
                      height="fit-content"
                      py={1}
                      colorScheme={label.color}
                    >
                      {label.text}
                    </Badge>
                  )}
                </Flex>
                <HStack>
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
                  {showEdit && (
                    <>
                      <IconButton
                        color={iconColor}
                        aria-label="remove"
                        icon={<FaEdit size={16} />}
                        onClick={() => {
                          decryptedMeeting &&
                            onClickToOpen(meeting, decryptedMeeting, timezone)
                        }}
                      />
                      <IconButton
                        color={iconColor}
                        aria-label="remove"
                        icon={<FaTrash size={16} />}
                        onClick={onOpen}
                      />
                      <Menu>
                        <MenuButton>
                          <IconButton
                            color={iconColor}
                            aria-label="remove"
                            icon={<FaEllipsisV size={16} />}
                            onClick={onOpen}
                          />
                        </MenuButton>
                        <Portal>
                          <MenuList backgroundColor={menuBgColor}>
                            {menuItems.map((val, index, arr) => (
                              <>
                                {val.link ? (
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
                                )}
                                {index !== arr.length - 1 && (
                                  <MenuDivider borderColor="neutral.600" />
                                )}
                              </>
                            ))}
                            {!isProduction && (
                              <>
                                <MenuDivider borderColor="neutral.600" />
                                <MenuItem
                                  backgroundColor={menuBgColor}
                                  onClick={() =>
                                    console.debug(decryptedMeeting)
                                  }
                                >
                                  Log info (for debugging)
                                </MenuItem>
                              </>
                            )}
                          </MenuList>
                        </Portal>
                      </Menu>
                    </>
                  )}
                </HStack>
              </Flex>
              <Box flex={1} pt={2}>
                <strong>
                  {dateToLocalizedRange(
                    meeting.start as Date,
                    meeting.end as Date,
                    timezone,
                    true
                  )}
                </strong>
              </Box>

              <Divider />
              <VStack alignItems="start">
                <HStack alignItems="flex-start">
                  <Text>Participants:</Text>
                  <Text>
                    <strong>{getNamesDisplay(decryptedMeeting)}</strong>
                  </Text>
                </HStack>

                {decryptedMeeting.content && (
                  <HStack alignItems="flex-start">
                    <Text>Description:</Text>
                    <Text
                      width="100%"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(decryptedMeeting.content, {
                          allowedTags: false,
                          allowedAttributes: false,
                        }),
                      }}
                    />
                  </HStack>
                )}
                <HStack alignItems="flex-start">
                  <Text>Meeting link:</Text>
                  <HStack alignItems="center">
                    <Link
                      href={addUTMParams(decryptedMeeting.meeting_url || '')}
                      isExternal
                      onClick={() => logEvent('Clicked to start meeting')}
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      maxWidth="100%"
                      flex={1}
                    >
                      <strong>{decryptedMeeting.meeting_url}</strong>
                    </Link>
                    <FaRegCopy
                      size={16}
                      onClick={handleCopy}
                      display="block"
                      cursor="pointer"
                    />
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
