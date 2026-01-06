import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { CiStreamOn } from 'react-icons/ci'
import { FaApple, FaCalendarAlt, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { TimeSlotSource } from '@/types/Meeting'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
  getQuickPollGoogleAuthConnectUrl,
  getQuickPollOffice365ConnectUrl,
} from '@/utils/api_helper'
import { isProduction } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

import WebCalDetail from './WebCalDetail'
import WebDavDetailsPanel from './WebDavCalendarDetail'

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  state?: string | null
  refetch?: () => Promise<void>
  isQuickPoll?: boolean
  participantId?: string
  pollData?: any
  pollSlug?: string
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
  state,
  refetch,
  isQuickPoll = false,
  participantId,
  pollData,
  pollSlug,
}) => {
  const [loading, setLoading] = useState<TimeSlotSource | undefined>()
  const [selectedProvider, setSelectedProvider] = useState<
    TimeSlotSource | undefined
  >()

  const selectOption = (provider: TimeSlotSource) => async () => {
    setLoading(provider)
    await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))

    const isGuestFlow = isQuickPoll && (participantId || pollSlug)

    const getGoogleUrl = isGuestFlow
      ? getQuickPollGoogleAuthConnectUrl
      : getGoogleAuthConnectUrl
    const getOfficeUrl = isGuestFlow
      ? getQuickPollOffice365ConnectUrl
      : getOffice365ConnectUrl

    let oauthState = state
    if (isGuestFlow) {
      const slug = pollSlug || pollData?.poll?.slug
      const stateObject = {
        participantId,
        pollSlug: slug,
        redirectTo: `/poll/${slug}`,
      }
      oauthState = Buffer.from(JSON.stringify(stateObject)).toString('base64')
    }

    switch (provider) {
      case TimeSlotSource.GOOGLE:
        const googleResponse = await getGoogleUrl(oauthState)
        !!googleResponse && window.location.assign(googleResponse.url)
        return
      case TimeSlotSource.OFFICE:
        const officeResponse = await getOfficeUrl(oauthState)
        !!officeResponse && window.location.assign(officeResponse.url)
        return
      case TimeSlotSource.ICLOUD:
      case TimeSlotSource.WEBDAV:
      case TimeSlotSource.WEBCAL:
        // no redirect, these providers will handle the logic
        break
      default:
        throw new Error(`Invalid provider selected: ${provider}`)
    }

    setSelectedProvider(provider)
    setLoading(undefined)
  }
  const handleWebDavSuccess = async () => {
    if (refetch) {
      await refetch()
    }
    setSelectedProvider(undefined)
    onClose()
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay>
        <ModalContent maxW={{ base: '20rem', md: '45rem' }}>
          <ModalHeader>
            <Heading size={'md'}>Choose calendar type</Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack>
              <HStack
                p="10"
                flexDirection={{ base: 'column', md: 'row' }}
                justifyContent="center"
                gap={4}
                flexWrap="wrap"
              >
                <Button
                  onClick={selectOption(TimeSlotSource.GOOGLE)}
                  leftIcon={<FaGoogle />}
                  variant="outline"
                  isLoading={loading === TimeSlotSource.GOOGLE}
                >
                  Google
                </Button>
                <Button
                  onClick={selectOption(TimeSlotSource.OFFICE)}
                  leftIcon={<FaMicrosoft />}
                  variant="outline"
                  isLoading={loading === TimeSlotSource.OFFICE}
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
                >
                  Webdav
                </Button>
                {!isProduction && (
                  <Button
                    onClick={selectOption(TimeSlotSource.WEBCAL)}
                    leftIcon={<CiStreamOn />}
                    variant={
                      selectedProvider === TimeSlotSource.WEBCAL
                        ? 'solid'
                        : 'outline'
                    }
                    display={isQuickPoll ? 'none' : undefined}
                    isLoading={loading === TimeSlotSource.WEBCAL}
                  >
                    Webcal
                  </Button>
                )}
              </HStack>
              <VStack
                hidden={selectedProvider !== TimeSlotSource.ICLOUD}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel
                  isApple={true}
                  onSuccess={handleWebDavSuccess}
                  isQuickPoll={isQuickPoll}
                  participantId={participantId}
                  pollData={pollData}
                />
              </VStack>
              <VStack
                hidden={selectedProvider !== TimeSlotSource.WEBDAV}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel
                  isApple={false}
                  onSuccess={handleWebDavSuccess}
                  isQuickPoll={isQuickPoll}
                  participantId={participantId}
                  pollData={pollData}
                />
              </VStack>
              <VStack
                hidden={selectedProvider !== TimeSlotSource.WEBCAL}
                p="10"
                pt="0"
              >
                <WebCalDetail
                  onSuccess={handleWebDavSuccess}
                  isQuickPoll={isQuickPoll}
                  participantId={participantId}
                  pollData={pollData}
                />
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  )
}

export default ConnectCalendarModal
