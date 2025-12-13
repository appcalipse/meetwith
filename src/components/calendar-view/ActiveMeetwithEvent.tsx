import { Button, IconButton } from '@chakra-ui/button'
import { HStack, Link, VStack } from '@chakra-ui/layout'
import { Tooltip, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { MdCancel } from 'react-icons/md'

import useAccountContext from '@/hooks/useAccountContext'
import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { Intents } from '@/types/Dashboard'
import { MeetingChangeType, MeetingDecrypted } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
} from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'
import { isAccountSchedulerOrOwner } from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { useToastHelpers } from '@/utils/toasts'

import { CancelMeetingDialog } from '../schedule/cancel-dialog'

interface ActiveMeetwithEventProps {
  slot: MeetingDecrypted<DateTime<boolean>>
}

const ActiveMeetwithEvent: React.FC<ActiveMeetwithEventProps> = ({ slot }) => {
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure()
  const { selectedSlot, setSelectedSlot } = useCalendarContext()
  const currentAccount = useAccountContext()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const { showSuccessToast, showInfoToast, showErrorToast } = useToastHelpers()

  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    slot?.participants,
    currentAccount?.address
  )
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
        `${appUrl}/dashboard/schedule?conferenceId=${slot.meeting_id}&intent=${Intents.UPDATE_MEETING}`
      )

      const url = window.URL.createObjectURL(
        new Blob([icsFile.value!], { type: 'text/plain' })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `meeting_${slot!.id}.ics`)

      document.body.appendChild(link)
      link.click()
      link.parentNode!.removeChild(link)
      showSuccessToast(
        'Downloaded calendar invite',
        'Ics file downloaded successfully'
      )
    } catch (e) {
      showErrorToast(
        'Download failed',
        'There was an error downloading the ics file. Please try again.'
      )
    }
  }
  const menuItems = React.useMemo(
    () => [
      {
        label: 'Add to Google Calendar',
        onClick: async () => {
          showInfoToast(
            'Opening Google Calendar',
            'A new tab will open with your Google Calendar invite.'
          )
          const url = await generateGoogleCalendarUrl(
            slot?.meeting_id || '',
            currentAccount!.address,
            slot?.start.toJSDate(),
            slot?.end.toJSDate(),
            slot?.title || 'No Title',
            slot?.content,
            slot?.meeting_url,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            slot?.participants
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
            slot?.meeting_id || '',
            currentAccount!.address,
            slot?.start.toJSDate(),
            slot?.end.toJSDate(),
            slot?.title || 'No Title',
            slot?.content,
            slot?.meeting_url,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            slot?.participants
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
          downloadIcs(
            {
              ...slot,
              start: slot.start.toJSDate(),
              end: slot.end.toJSDate(),
            },
            currentAccount!.address
          )
        },
      },
    ],
    [slot, currentAccount]
  )
  return (
    <VStack w="100%" spacing={4} alignItems="flex-start">
      <Button variant="link" color="primary.200" fontWeight={700}>
        Close
      </Button>
      <HStack>
        <Link
          href={addUTMParams(slot?.meeting_url || '')}
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
        {isSchedulerOrOwner && (
          <Tooltip label="Cancel meeting" placement="top">
            <IconButton
              color={iconColor}
              aria-label="remove"
              icon={<MdCancel size={16} />}
              onClick={onCancelOpen}
            />
          </Tooltip>
        )}
      </HStack>
      <CancelMeetingDialog
        isOpen={isCancelOpen}
        onClose={onCancelClose}
        decryptedMeeting={{
          ...slot,
          start: slot.start.toJSDate(),
          end: slot.end.toJSDate(),
        }}
        currentAccount={currentAccount}
        afterCancel={() => setSelectedSlot(null)}
        // TODO: create a removed slot array to map removed slot to so we don't need to refetch all slots and can just filter them out with it
      />
    </VStack>
  )
}

export default ActiveMeetwithEvent
