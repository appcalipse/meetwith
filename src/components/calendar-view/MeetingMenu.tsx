import {
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from '@chakra-ui/menu'
import { IconButton, useColorModeValue } from '@chakra-ui/react'
import { FC, useCallback, useMemo } from 'react'
import { FaEllipsisV } from 'react-icons/fa'

import { Account } from '@/types/Account'
import { Intents } from '@/types/Dashboard'
import { MeetingChangeType, MeetingDecrypted } from '@/types/Meeting'
import {
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
} from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'
import { useToastHelpers } from '@/utils/toasts'

interface MeetingMenuProps {
  slot: MeetingDecrypted
  currentAccount: Account
}

const MeetingMenu: FC<MeetingMenuProps> = ({ slot, currentAccount }) => {
  const { showSuccessToast, showInfoToast, showErrorToast } = useToastHelpers()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')

  const downloadIcs = useCallback(
    async (info: MeetingDecrypted, currentConnectedAccountAddress: string) => {
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
      } catch (_e) {
        showErrorToast(
          'Download failed',
          'There was an error downloading the ics file. Please try again.'
        )
      }
    },
    []
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
            slot?.meeting_id || '',
            currentAccount!.address,
            slot?.start,
            slot?.end,
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
            slot?.start,
            slot?.end,
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
          downloadIcs(slot, currentAccount!.address)
        },
      },
    ],
    [slot, currentAccount]
  )
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        color={iconColor}
        aria-label="option"
        icon={<FaEllipsisV size={16} />}
        key={`${slot?.id}-option`}
      />
      <MenuList backgroundColor={menuBgColor}>
        {menuItems.map((val, index, arr) => [
          <MenuItem
            onClick={val.onClick}
            backgroundColor={menuBgColor}
            key={`${val.label}-${slot?.id}`}
            aria-busy
          >
            {val.label}
          </MenuItem>,
          index !== arr.length - 1 && (
            <MenuDivider
              key={`divider-${index}-${slot?.id}`}
              borderColor="neutral.600"
            />
          ),
        ])}
      </MenuList>
    </Menu>
  )
}

export default MeetingMenu
