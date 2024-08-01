import {
  Button,
  Heading,
  HStack,
  Input,
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
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import { GroupMember } from '@/types/Group'
import { editGroup, removeGroupMember } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'
import { ellipsizeAddress } from '@/utils/user_manager'

export interface IRemoveGroupMemberModal {
  groupID: string | null
  resetState: () => void
  onClose: () => void
  isOpen: boolean
  selectedGroupMember: GroupMember
  groupName: string
}

const RemoveGroupMemberModal: React.FC<IRemoveGroupMemberModal> = props => {
  const [isRemoving, setIsRemoving] = React.useState(false)

  const toast = useToast()
  const { push } = useRouter()
  const handleRemoveGroupMember = async () => {
    if (!props.groupID) return
    setIsRemoving(true)
    try {
      const isSuccessful = await removeGroupMember(
        props.groupID,
        (props.selectedGroupMember.invitePending
          ? props.selectedGroupMember.userId
          : props.selectedGroupMember.address) as string,
        props.selectedGroupMember.invitePending
      )
      setIsRemoving(false)
      if (!isSuccessful) return
      props.onClose()
      props.resetState()
    } catch (error: any) {
      const isJsonErr = isJson(error.message)
      const errorMessage = isJsonErr
        ? JSON.parse(error.message)?.error
        : error.message
      toast({
        title: 'Error removing member',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
    setIsRemoving(false)
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
          <Heading size={'md'}>Remove group member</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              Are you sure you want to remove{' '}
              {props.selectedGroupMember.displayName ||
                ellipsizeAddress(props.selectedGroupMember.address || '')}{' '}
              from {props.groupName || 'the group'}?
            </Text>
            <HStack ml={'auto'} w={'fit-content'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="grayButton">
                No
              </Button>
              <Button
                isLoading={isRemoving}
                onClick={handleRemoveGroupMember}
                colorScheme="primary"
                isDisabled={!props.groupID}
              >
                Yes
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default RemoveGroupMemberModal
