import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaApple, FaCalendarAlt, FaMicrosoft } from 'react-icons/fa'

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
  const [selecteProvider, setSelectedProvider] = useState<
    ConnectedCalendarProvider | undefined
  >()
  const selectOption = (provider: ConnectedCalendarProvider) => async () => {
    setLoading(provider)
    await onSelect(provider)
    setSelectedProvider(provider)
    setLoading(undefined)
  }

  const toast = useToast()

  const onWebdavSuccess = () => {}

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
                  leftIcon={<Image src="/assets/google.svg" size="24px" />}
                  variant="outline"
                  isLoading={loading === ConnectedCalendarProvider.GOOGLE}
                >
                  Google
                </Button>
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.OFFICE)}
                  leftIcon={<FaMicrosoft />}
                  variant="outline"
                  isLoading={loading === ConnectedCalendarProvider.OFFICE}
                >
                  Office 365
                </Button>
                <Button
                  onClick={selectOption(ConnectedCalendarProvider.ICLOUD)}
                  leftIcon={<FaApple />}
                  variant={
                    selecteProvider === ConnectedCalendarProvider.ICLOUD
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
                  variant={
                    selecteProvider === ConnectedCalendarProvider.WEBDAV
                      ? 'solid'
                      : 'outline'
                  }
                  isLoading={loading === ConnectedCalendarProvider.WEBDAV}
                >
                  Webdav
                </Button>
              </HStack>
              <VStack
                hidden={selecteProvider !== ConnectedCalendarProvider.ICLOUD}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel
                  isApple={true}
                  onSuccess={onWebdavSuccess}
                />
              </VStack>
              <VStack
                hidden={selecteProvider !== ConnectedCalendarProvider.WEBDAV}
                p="10"
                pt="0"
              >
                <WebDavDetailsPanel
                  isApple={false}
                  onSuccess={onWebdavSuccess}
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
