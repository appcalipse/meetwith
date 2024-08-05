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
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React from 'react'

import { leaveGroup } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

export interface IGroupInviteCardModal {
  groupID: string | null
  resetState: () => void
  onClose: () => void
  isOpen: boolean
}

const LeaveGroupModal: React.FC<IGroupInviteCardModal> = props => {
  const [isLeaving, setIsLeaving] = React.useState(false)
  const handleLeaveGroup = async () => {
    if (!props.groupID) return
    setIsLeaving(true)
    try {
      const isSuccessful = await leaveGroup(props.groupID)
      if (!isSuccessful) return
      setIsLeaving(false)
      props.resetState()
      props.onClose()
    } catch (error: any) {
      handleApiError('Error leaving group', error)
    }
    setIsLeaving(false)
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
          <Heading size={'md'}>Leave group</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <Text size={'base'}>
            Are you sure? You cannot undo this action afterwards. However, you
            can always get invited back by an admin.
          </Text>
          <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
            <Button onClick={props.onClose} colorScheme="grayButton">
              Cancel
            </Button>
            <Button
              isLoading={isLeaving}
              onClick={handleLeaveGroup}
              colorScheme="primary"
            >
              Leave group
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default LeaveGroupModal
