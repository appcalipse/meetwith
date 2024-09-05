import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { FC, FormEvent, useEffect, useState } from 'react'

import GroupInviteForm from '@/components/group/GroupInviteForm'
import { GroupInvitePayload, MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import {
  getExistingAccounts,
  getExistingAccountsSimple,
  inviteUsers,
} from '@/utils/api_helper'
import {
  isEthereumAddressOrDomain,
  isValidEmail,
  isValidEVMAddress,
} from '@/utils/validations'

import InfoTooltip from '../profile/components/Tooltip'
import InvitedUsersList from './InvitedUsersList'

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
  onInviteSuccess,
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
