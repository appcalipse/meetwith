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
  VStack,
} from '@chakra-ui/react'
import React, { useContext } from 'react'

import { ScheduleContext } from '@/pages/dashboard/schedule'

export interface IGroupInviteCardModal {
  onClose: () => void
  isOpen: boolean
  isScheduler: boolean
  openSchedulerModal: () => void
}

const DeleteMeetingModal: React.FC<IGroupInviteCardModal> = props => {
  const { handleDelete, isDeleting } = useContext(ScheduleContext)
  const onDelete = () => {
    if (props.isScheduler) {
      props.openSchedulerModal()
    } else {
      handleDelete()
    }
    props.onClose()
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Delete Meeting</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              {props.isScheduler
                ? `You're the current scheduler of this meeting. Deleting it is a permanent action and cannot be undone. 
    Before proceeding, you must assign a new scheduler.`
                : `Are you sure you want to delete this meeting? This action is permanent and cannot be undone. 
    You will lose all access to the meeting.`}
            </Text>
            <HStack ml={'auto'} w={'fit-content'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="neutral">
                Cancel
              </Button>
              <Button
                isLoading={isDeleting}
                onClick={() => onDelete()}
                colorScheme="primary"
              >
                {props.isScheduler ? 'Assign New Scheduler' : 'Delete Meeting'}
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default DeleteMeetingModal
