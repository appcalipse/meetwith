import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useContext, useState } from 'react'
import { v4 } from 'uuid'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { EditMode } from '@/types/Dashboard'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import {
  addOrUpdateICloud,
  addOrUpdateWebdav,
  savePollParticipantCalendar,
  validateWebdav,
} from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

interface WebDavDetailsPanelProps {
  isApple: boolean
  payload?: {
    url: string
    username: string
    password: string
  }
  onSuccess: () => Promise<void>
  isQuickPoll?: boolean
  participantId?: string
  pollData?: QuickPollBySlugResponse
}

const APPLE_DISCLAIMER = (
  <Text>
    Generate an app specific password to use with <b>Meetwith</b> at{' '}
    <Link
      rel="nofollow"
      target="_blank"
      href="https://appleid.apple.com/account/manage"
    >
      https://appleid.apple.com/account/manage
    </Link>
    . Your credentials will be encrypted and then stored.
  </Text>
)
const GENERIC_DISCLAIMER = (
  <Text>Your credentials will be encrypted and then stored.</Text>
)
const APPLE_WEBDAV_URL = 'https://caldav.icloud.com'

const WebDavDetailsPanel: React.FC<WebDavDetailsPanelProps> = ({
  payload,
  isApple,
  onSuccess,
  isQuickPoll = false,
  participantId,
  pollData,
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const onShowPassword = () => setShowPassword(value => !value)
  const [url, setUrl] = useState(isApple ? APPLE_WEBDAV_URL : payload?.url)
  const [username, setUsername] = useState(payload?.username)
  const [password, setPassword] = useState(payload?.password)
  const { showErrorToast, showSuccessToast } = useToastHelpers()
  const onboardingContext = useContext(OnboardingContext)

  const checkWebDav = async () => {
    if (!url || !username || !password) {
      showErrorToast(
        'URL, Username and Password are required.',
        'Please enter your WebDAV URL, username and password.'
      )
      setLoading(false)
    }
    try {
      const calendars = await validateWebdav(url!, username!, password!)
      if (!calendars) {
        showErrorToast('Something went wrong', 'Invalid credentials provided.')
      }
      return calendars
    } catch (e: unknown) {
      const error = e as Error
      showErrorToast(
        'Something went wrong',
        error.message || 'Invalid credentials provided.'
      )
    }
  }

  const onSaveOrUpdate = async () => {
    try {
      setLoading(true)
      const calendars = await checkWebDav()
      if (!calendars) {
        return
      }

      if (isQuickPoll && participantId) {
        if (isApple) {
          if (!username || !password) {
            showErrorToast(
              'Username and Password are required.',
              'Please enter your Apple ID email and app specific password.'
            )
            setLoading(false)
            return
          }
        } else {
          if (!username || !password || !url) {
            showErrorToast(
              'URL, Username and Password are required.',
              'Please enter your WebDAV URL, username and password.'
            )
            setLoading(false)
            return
          }
        }

        const credentials = {
          url: isApple ? APPLE_WEBDAV_URL : url,
          username,
          password,
        }

        await savePollParticipantCalendar(
          participantId!,
          username!,
          isApple ? 'icloud' : 'webdav',
          credentials as unknown as Record<string, unknown>
        )
      } else {
        if (isApple) {
          if (!username || !password) {
            showErrorToast(
              'Username and Password are required.',
              'Please enter your Apple ID email and app specific password.'
            )
            setLoading(false)
            return
          }

          await addOrUpdateICloud({
            url: APPLE_WEBDAV_URL,
            username,
            password,
            calendars: calendars.map((calendar, index: number) => {
              return {
                calendarId: calendar.url,
                sync: true,
                enabled: index === 0,
                name:
                  typeof calendar.displayName === 'string'
                    ? calendar.displayName
                    : calendar.ctag ?? v4(),
                color: calendar.calendarColor && calendar.calendarColor._cdata,
              }
            }),
          })
        } else {
          if (!username || !password || !url) {
            showErrorToast(
              'URL, Username and Password are required.',
              'Please enter your WebDAV URL, username and password.'
            )
            setLoading(false)
            return
          }

          await addOrUpdateWebdav({
            url,
            username,
            password,
            calendars: calendars.map((calendar, index: number) => {
              return {
                calendarId: calendar.url,
                sync: true,
                enabled: index === 0,
                name:
                  typeof calendar.displayName === 'string'
                    ? calendar.displayName
                    : calendar.ctag ?? v4(),
                color: calendar.calendarColor && calendar.calendarColor._cdata,
              }
            }),
          })
        }
        await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
        onboardingContext.reload()
      }

      !!onSuccess && (await onSuccess())
      showSuccessToast(
        'Calendar connected',
        "You've just connected a new calendar provider."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      {isApple ? APPLE_DISCLAIMER : GENERIC_DISCLAIMER}
      <FormControl pt={2} display={isApple ? 'none' : 'block'}>
        <FormLabel>URL</FormLabel>
        <Input
          value={url}
          type="url"
          placeholder="Calendar URL"
          onChange={event => setUrl(event.target.value)}
          isDisabled={isApple}
        />
      </FormControl>
      <FormControl pt={2}>
        <FormLabel>{isApple ? 'Email' : 'Username'}</FormLabel>
        <Input
          value={username}
          type="text"
          onChange={event => setUsername(event.target.value)}
          placeholder={isApple ? 'Apple ID email' : 'Calendar Username'}
        />
      </FormControl>
      <FormControl pt={2}>
        <FormLabel>Password</FormLabel>
        <InputGroup size="md">
          <Input
            value={password}
            pr="4.5rem"
            type={showPassword ? 'text' : 'password'}
            onChange={event => setPassword(event.target.value)}
            placeholder="Calendar password"
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={onShowPassword}>
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <Box
        style={{
          display: 'flex',
          alignItems: 'end',
          flexDirection: 'column',
        }}
      >
        <Button
          mt="10"
          isLoading={loading}
          isDisabled={loading}
          colorScheme="primary"
          onClick={onSaveOrUpdate}
        >
          Connect
        </Button>
      </Box>
    </Box>
  )
}

export default WebDavDetailsPanel
