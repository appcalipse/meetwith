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
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { removeMeetingType } from '@utils/api_helper'
import { handleApiError } from '@utils/error_helper'
import { ApiFetchError, LastMeetingTypeError } from '@utils/errors'
import React, { FC } from 'react'

interface IProps {
  onClose: () => void
  isOpen: boolean
  meetingTypeId?: string
  refetch: () => Promise<void>
}
const DeleteMeetingTypeConfirmation: FC<IProps> = props => {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const toast = useToast()
  const handleDeleteSessionType = async () => {
    setIsDeleting(true)
    try {
      if (props.meetingTypeId) {
        await removeMeetingType(props.meetingTypeId)
        await props.refetch()
        props.onClose()
      }
    } catch (e: unknown) {
      if (e instanceof LastMeetingTypeError) {
        toast({
          title: 'Cannot delete',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ApiFetchError) {
        handleApiError('Error deleting meeting type', e)
      }
    }
    setIsDeleting(false)
  }

  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Delete Session Type</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              Are you sure ? This is a serious action that cannot be undone. You
              will not be able to create new meetings with this session type.
            </Text>
            <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="neutral">
                Cancel
              </Button>
              <Button
                isLoading={isDeleting}
                onClick={handleDeleteSessionType}
                colorScheme="primary"
              >
                Delete SessionType
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default DeleteMeetingTypeConfirmation
