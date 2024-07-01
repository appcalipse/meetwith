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
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React from 'react'

import { Group } from '@/types/Group'
import { joinGroup, rejectGroup } from '@/utils/api_helper'

export interface IGroupInviteCardModal {
  group: Group | undefined
  resetState: () => void
  onClose: () => void
  inviteEmail?: string
}

const GroupJoinModal: React.FC<IGroupInviteCardModal> = props => {
  const [declining, setDeclining] = React.useState(false)
  const [accepting, setAccepting] = React.useState(false)
  const { push } = useRouter()
  const handleDecline = async () => {
    if (!props.group?.id) return
    setDeclining(true)
    await rejectGroup(props.group.id, props.inviteEmail)
    setDeclining(false)
    props.onClose()
    push('/dashboard/groups')
    props.resetState()
  }
  const handleAccept = async () => {
    if (!props.group?.id) return
    setAccepting(true)
    await joinGroup(props.group.id, props.inviteEmail)
    setAccepting(false)
    props.onClose()
    push('/dashboard/groups')
    props.resetState()
  }
  return (
    <Modal
      onClose={() => {
        props.onClose()
        push('/dashboard/groups')
      }}
      isOpen={!!props.group?.id}
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
          <Heading size={'md'}>Accept invite</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <Text size={'sm'}>Would you like to join {props.group?.name}?</Text>
          <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
            <Button
              isLoading={accepting}
              onClick={handleAccept}
              colorScheme="grayButton"
            >
              Join Group
            </Button>
            <Button
              isLoading={declining}
              colorScheme="primary"
              onClick={handleDecline}
            >
              Decline
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GroupJoinModal
