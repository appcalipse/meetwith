import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import React, { FC } from 'react'

import GroupInviteForm from '@/components/group/GroupInviteForm'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
  onInviteSuccess?: () => void
  resetState: () => void
}

const InviteModal: FC<InviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  resetState,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent
        maxWidth="500px"
        width="500px"
        border={1}
        borderColor="neutral.600"
      >
        <ModalHeader pt={6} fontSize="24px">
          Invite Group Members
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <GroupInviteForm
            groupId={groupId}
            groupName={groupName}
            onClose={() => {
              onClose()
              resetState()
            }}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default InviteModal
