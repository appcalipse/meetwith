import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { FaApple, FaCalendarAlt, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { TimeSlotSource } from '@/types/Meeting'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import {
  getQuickPollGoogleAuthConnectUrl,
  getQuickPollOffice365ConnectUrl,
  savePollParticipantCalendar,
  validateWebdav,
} from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

interface ConnectCalendarForPollProps {
  isOpen: boolean
  onClose: () => void
  participantId: string
  onSuccess?: () => void
  pollData?: QuickPollBySlugResponse
}

interface PollWebDavDetailsPanelProps {
  isApple: boolean
  participantId: string
  onSuccess: () => void
}

interface WebDavCredentials {
  url: string
  username: string
  password: string
}

const PollWebDavDetailsPanel: React.FC<PollWebDavDetailsPanelProps> = ({
  isApple,
  participantId,
  onSuccess,
}) => {
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  const handleSubmit = async () => {
    if (!url || !username || !password) {
      showErrorToast('Missing fields', 'Please fill in all required fields.')
      return
    }

    setIsLoading(true)

    try {
      // Validate the WebDAV connection
      await validateWebdav(url, username, password)

      // Save the calendar connection
      const credentials: WebDavCredentials = { url, username, password }
      await savePollParticipantCalendar(
        participantId,
        username,
        isApple ? 'icloud' : 'webdav',
        credentials as unknown as Record<string, unknown>
      )

      showSuccessToast(
        'Calendar connected',
        'Your calendar has been connected successfully!'
      )

      onSuccess()
    } catch (error) {
      showErrorToast(
        'Connection failed',
        'Failed to connect to your calendar. Please check your credentials and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const APPLE_DISCLAIMER = (
    <Text color="neutral.300" fontSize="sm">
      Generate an app specific password to use with <b>Meetwith</b> at{' '}
      <Link
        rel="nofollow"
        target="_blank"
        href="https://appleid.apple.com/account/manage"
        color="primary.200"
      >
        https://appleid.apple.com/account/manage
      </Link>
      . Your credentials will be encrypted and then stored.
    </Text>
  )

  return (
    <VStack spacing={4} align="stretch" w="full">
      {isApple && APPLE_DISCLAIMER}

      <FormControl isRequired>
        <FormLabel color="neutral.200">
          {isApple ? 'Server URL' : 'CalDAV Server URL'}
        </FormLabel>
        <Input
          placeholder={
            isApple
              ? 'https://caldav.icloud.com'
              : 'https://your-server.com/caldav'
          }
          value={url}
          onChange={e => setUrl(e.target.value)}
          bg="neutral.800"
          borderColor="neutral.600"
          color="neutral.200"
          _placeholder={{ color: 'neutral.500' }}
          _focus={{ borderColor: 'primary.400' }}
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="neutral.200">
          {isApple ? 'Apple ID' : 'Username'}
        </FormLabel>
        <Input
          placeholder={isApple ? 'your-email@icloud.com' : 'username'}
          value={username}
          onChange={e => setUsername(e.target.value)}
          bg="neutral.800"
          borderColor="neutral.600"
          color="neutral.200"
          _placeholder={{ color: 'neutral.500' }}
          _focus={{ borderColor: 'primary.400' }}
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="neutral.200">
          {isApple ? 'App-Specific Password' : 'Password'}
        </FormLabel>
        <InputGroup>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            bg="neutral.800"
            borderColor="neutral.600"
            color="neutral.200"
            _placeholder={{ color: 'neutral.500' }}
            _focus={{ borderColor: 'primary.400' }}
          />
          <InputRightElement>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
              color="neutral.400"
              _hover={{ color: 'neutral.200' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        onClick={handleSubmit}
        isLoading={isLoading}
        loadingText="Connecting..."
        bg="primary.200"
        color="neutral.900"
        _hover={{ bg: 'primary.300' }}
        _active={{ bg: 'primary.400' }}
        mt={4}
      >
        Connect Calendar
      </Button>
    </VStack>
  )
}

const ConnectCalendarForPoll: React.FC<ConnectCalendarForPollProps> = ({
  isOpen,
  onClose,
  participantId,
  onSuccess,
  pollData,
}) => {
  const [loading, setLoading] = useState<TimeSlotSource | undefined>()
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [selectedProvider, setSelectedProvider] = useState<
    TimeSlotSource | undefined
  >()

  const selectOption = (provider: TimeSlotSource) => async () => {
    setLoading(provider)
    await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))

    switch (provider) {
      case TimeSlotSource.GOOGLE:
        try {
          const googleResponse = await getQuickPollGoogleAuthConnectUrl(
            Buffer.from(
              JSON.stringify({
                participantId,
                pollSlug: pollData?.poll.slug,
              })
            ).toString('base64')
          )
          if (googleResponse?.url) {
            window.location.assign(googleResponse.url)
          }
        } catch (error) {
          showErrorToast(
            'Connection failed',
            'Failed to connect Google Calendar. Please try again.'
          )
        }
        setLoading(undefined)
        return
      case TimeSlotSource.OFFICE:
        try {
          const officeResponse = await getQuickPollOffice365ConnectUrl(
            Buffer.from(
              JSON.stringify({
                participantId,
                pollSlug: pollData?.poll.slug,
              })
            ).toString('base64')
          )
          if (officeResponse?.url) {
            window.location.assign(officeResponse.url)
          }
        } catch (error) {
          showErrorToast(
            'Connection failed',
            'Failed to connect Office 365. Please try again.'
          )
        }
        setLoading(undefined)
        return
      case TimeSlotSource.ICLOUD:
      case TimeSlotSource.WEBDAV:
        // These providers will handle the logic through WebDavDetailsPanel
        break
      default:
        throw new Error(`Invalid provider selected: ${provider}`)
    }

    setSelectedProvider(provider)
    setLoading(undefined)
  }

  const handleWebDavSuccess = async (
    email: string,
    provider: string,
    payload?: Record<string, unknown>
  ) => {
    try {
      await savePollParticipantCalendar(participantId, email, provider, payload)

      showSuccessToast(
        'Calendar connected',
        'Your calendar has been connected successfully!'
      )

      setSelectedProvider(undefined)
      onClose()

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      showErrorToast(
        'Connection failed',
        'Failed to connect your calendar. Please try again.'
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        border="1px solid"
        borderColor="neutral.800"
        borderRadius="12px"
        maxW="45rem"
      >
        <ModalHeader>
          <Heading size={'md'} color="neutral.0">
            Import from calendar
          </Heading>
        </ModalHeader>
        <ModalCloseButton color="neutral.0" />
        <ModalBody>
          <VStack>
            <HStack
              p="10"
              flexDirection={{ base: 'column', md: 'row' }}
              justifyContent="center"
              gap={4}
            >
              <Button
                onClick={selectOption(TimeSlotSource.GOOGLE)}
                leftIcon={<FaGoogle />}
                variant="outline"
                isLoading={loading === TimeSlotSource.GOOGLE}
                borderColor="neutral.600"
                color="neutral.200"
                _hover={{ borderColor: 'neutral.500' }}
              >
                Google
              </Button>
              <Button
                onClick={selectOption(TimeSlotSource.OFFICE)}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                isLoading={loading === TimeSlotSource.OFFICE}
                borderColor="neutral.600"
                color="neutral.200"
                _hover={{ borderColor: 'neutral.500' }}
              >
                Office 365
              </Button>
              <Button
                onClick={selectOption(TimeSlotSource.ICLOUD)}
                leftIcon={<FaApple />}
                variant={
                  selectedProvider === TimeSlotSource.ICLOUD
                    ? 'solid'
                    : 'outline'
                }
                isLoading={loading === TimeSlotSource.ICLOUD}
                borderColor="neutral.600"
                color="neutral.200"
                _hover={{ borderColor: 'neutral.500' }}
                bg={
                  selectedProvider === TimeSlotSource.ICLOUD
                    ? 'primary.200'
                    : 'transparent'
                }
              >
                iCloud
              </Button>
              <Button
                onClick={selectOption(TimeSlotSource.WEBDAV)}
                leftIcon={<FaCalendarAlt />}
                variant={
                  selectedProvider === TimeSlotSource.WEBDAV
                    ? 'solid'
                    : 'outline'
                }
                isLoading={loading === TimeSlotSource.WEBDAV}
                borderColor="neutral.600"
                color="neutral.200"
                _hover={{ borderColor: 'neutral.500' }}
                bg={
                  selectedProvider === TimeSlotSource.WEBDAV
                    ? 'primary.200'
                    : 'transparent'
                }
              >
                WebDAV
              </Button>
            </HStack>
            {selectedProvider === TimeSlotSource.ICLOUD && (
              <VStack p="10" pt="0">
                <PollWebDavDetailsPanel
                  isApple={true}
                  participantId={participantId}
                  onSuccess={() => handleWebDavSuccess('', 'icloud')}
                />
              </VStack>
            )}
            {selectedProvider === TimeSlotSource.WEBDAV && (
              <VStack p="10" pt="0">
                <PollWebDavDetailsPanel
                  isApple={false}
                  participantId={participantId}
                  onSuccess={() => handleWebDavSuccess('', 'webdav')}
                />
              </VStack>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ConnectCalendarForPoll
