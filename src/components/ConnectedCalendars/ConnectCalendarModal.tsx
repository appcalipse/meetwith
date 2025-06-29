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
import { FaApple, FaCalendarAlt, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { TimeSlotSource } from '@/types/Meeting'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
} from '@/utils/api_helper'

import WebDavDetailsPanel from './WebDavCalendarDetail'

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  state?: string | null
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [loading, setLoading] = useState<TimeSlotSource | undefined>()
  const [selectedProvider, setSelectedProvider] = useState<
    TimeSlotSource | undefined
  >()
  const selectOption = (provider: TimeSlotSource) => async () => {
    setLoading(provider)

    switch (provider) {
      case TimeSlotSource.GOOGLE:
        const googleResponse = await getGoogleAuthConnectUrl(state)
        !!googleResponse && window.location.assign(googleResponse.url)
        return
      case TimeSlotSource.OFFICE:
        const officeResponse = await getOffice365ConnectUrl(state)
        !!officeResponse && window.location.assign(officeResponse.url)
        return
      case TimeSlotSource.ICLOUD:
      case TimeSlotSource.WEBDAV:
        // no redirect, these providers will handle the logic
        break
      default:
        throw new Error(`Invalid provider selected: ${provider}`)
    }

    setSelectedProvider(provider)
    setLoading(undefined)
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
        <ModalContent maxW="45rem">
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
              </HStack>
              <VStack
                hidden={selectedProvider !== TimeSlotSource.ICLOUD}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel isApple={true} />
              </VStack>
              <VStack
                hidden={selectedProvider !== TimeSlotSource.WEBDAV}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel isApple={false} />
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  )
}

export default ConnectCalendarModal
