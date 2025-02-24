import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { v4 } from 'uuid'

import {
  addOrUpdateICloud,
  addOrUpdateWebdav,
  validateWebdav,
} from '@/utils/api_helper'

interface WebDavDetailsPanelProps {
  isApple: boolean
  payload?: {
    url: string
    username: string
    password: string
  }
  onSuccess?: () => void
}

const APPLE_DISCLAIMER = (
  <Text align={'justify'}>
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
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const onShowPassword = () => setShowPassword(value => !value)

  const [url, setUrl] = useState(isApple ? APPLE_WEBDAV_URL : payload?.url)
  const [username, setUsername] = useState(payload?.username)
  const [password, setPassword] = useState(payload?.password)

  const toast = useToast()

  const checkWebDav = async () => {
    if (!url || !username || !password) {
      toast({
        title: 'URL, Username and Password are required.',
        description: 'Please enter your WebDAV URL, username and password.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      setLoading(false)
    }
    try {
      const calendars = await validateWebdav(url!, username!, password!)
      if (!calendars) {
        toast({
          title: 'Something went wrong',
          description: 'Invalid credentials provided.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
      return calendars
    } catch (e: unknown) {
      const error = e as Error
      toast({
        title: 'Something went wrong',
        description: error.message || 'Invalid credentials provided.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  const onSaveOrUpdate = async () => {
    try {
      setLoading(true)
      const calendars = await checkWebDav()
      if (!calendars) {
        return
      }

      if (isApple) {
        if (!username || !password) {
          toast({
            title: 'Username and Password are required.',
            description:
              'Please enter your Apple ID email and app specific password.',
            status: 'error',
            duration: 5000,
            position: 'top',
            isClosable: true,
          })
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
        window.location.href = '/dashboard/calendars?calendarResult=success'
      } else {
        if (!username || !password || !url) {
          toast({
            title: 'URL, Username and Password are required.',
            description: 'Please enter your WebDAV URL, username and password.',
            status: 'error',
            duration: 5000,
            position: 'top',
            isClosable: true,
          })
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
        window.location.href = '/dashboard/calendars?calendarResult=success'
      }
      !!onSuccess && onSuccess()
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
