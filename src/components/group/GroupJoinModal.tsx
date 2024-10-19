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

import { Group } from '@/types/Group'
import { logEvent } from '@/utils/analytics'
import { joinGroup, rejectGroup } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

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
    try {
      await rejectGroup(props.group.id, props.inviteEmail)
      logEvent('Rejected invite', {
        group: props.group,
        email: props.inviteEmail,
      })
    } catch (error: any) {
      handleApiError('Error rejecting invite', error)
    }
    props.onClose()
    push('/dashboard/groups')
    props.resetState()
    setDeclining(false)
  }
  const handleAccept = async () => {
    if (!props.group?.id) return
    setAccepting(true)
    try {
      await joinGroup(props.group.id, props.inviteEmail)
      logEvent('Accepted invite', {
        group: props.group,
        email: props.inviteEmail,
      })
    } catch (error: any) {
      handleApiError('Error accepting invite', error)
    }
    push('/dashboard/groups')
    props.onClose()
    props.resetState()
    setAccepting(false)
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
              colorScheme="neutral"
              isLoading={declining}
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              isLoading={accepting}
              colorScheme="primary"
            >
              Join Group
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GroupJoinModal
