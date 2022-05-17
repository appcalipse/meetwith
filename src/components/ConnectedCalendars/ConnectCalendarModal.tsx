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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaApple, FaCalendarAlt, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { ConnectedCalendarProvider } from '../../types/CalendarConnections'
import WebDavDetailsPanel from './WebDavCalendarDetail'

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (provider: ConnectedCalendarProvider) => Promise<void>
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [loading, setLoading] = useState<
    ConnectedCalendarProvider | undefined
  >()
  const [selectedProvider, setSelectedProvider] = useState<
    ConnectedCalendarProvider | undefined
  >()
  const selectOption = (provider: ConnectedCalendarProvider) => async () => {
    setLoading(provider)
    await onSelect(provider)
    setSelectedProvider(provider)
    setLoading(undefined)
  }

  const buttonColor = useColorModeValue('gray.700', 'white')

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
                gridGap={{ base: '16px', md: '0' }}
              >
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.GOOGLE)}
                  leftIcon={<FaGoogle />}
                  variant="outline"
                  color={buttonColor}
                  isLoading={loading === ConnectedCalendarProvider.GOOGLE}
                >
                  Google
                </Button>
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.OFFICE)}
                  leftIcon={<FaMicrosoft />}
                  variant="outline"
                  color={buttonColor}
                  isLoading={loading === ConnectedCalendarProvider.OFFICE}
                >
                  Office 365
                </Button>
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.ICLOUD)}
                  leftIcon={<FaApple />}
                  color={buttonColor}
                  variant={
                    selectedProvider === ConnectedCalendarProvider.ICLOUD
                      ? 'solid'
                      : 'outline'
                  }
                  isLoading={loading === ConnectedCalendarProvider.ICLOUD}
                >
                  iCloud
                </Button>
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.WEBDAV)}
                  leftIcon={<FaCalendarAlt />}
                  color={buttonColor}
                  variant={
                    selectedProvider === ConnectedCalendarProvider.WEBDAV
                      ? 'solid'
                      : 'outline'
                  }
                  isLoading={loading === ConnectedCalendarProvider.WEBDAV}
                >
                  Webdav
                </Button>
              </HStack>
              <VStack
                hidden={selectedProvider !== ConnectedCalendarProvider.ICLOUD}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel isApple={true} />
              </VStack>
              <VStack
                hidden={selectedProvider !== ConnectedCalendarProvider.WEBDAV}
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
