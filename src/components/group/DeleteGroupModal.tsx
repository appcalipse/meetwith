import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
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
import React, { useState } from 'react'

import { deleteGroup } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

export interface IGroupInviteCardModal {
  groupID: string | null
  resetState: () => void
  onClose: () => void
  isOpen: boolean
  groupName: string | null
}

const DeleteGroupModal: React.FC<IGroupInviteCardModal> = props => {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [input, setInput] = useState('')
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value)
  const handleDeleteGroup = async () => {
    if (!props.groupID) return
    setIsDeleting(true)
    try {
      const isSuccessful = await deleteGroup(props.groupID)
      setIsDeleting(false)
      if (!isSuccessful) return
      props.resetState()
      props.onClose()
    } catch (error: any) {
      handleApiError('Error deleting group', error)
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
      <ModalOverlay />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Delete group</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              Are you sure ? This is a serious action that cannot be undone. You
              and all members of this group will permanently lose all
              information in this group.
            </Text>
            <HStack
              bg={'yellow.300'}
              color={'neutral.900'}
              py={3}
              px={4}
              gap={3}
              borderRadius={'6px'}
            >
              <WarningTwoIcon w={5} h={5} />
              <Text fontWeight="500">
                Confirm that you would like to delete this group by typing the
                group name below.
              </Text>
            </HStack>
            <FormControl>
              <FormLabel>Group name</FormLabel>
              <Input
                type="email"
                value={input}
                _placeholder={{
                  color: 'neutral.400',
                }}
                borderColor="neutral.400"
                placeholder="Enter group name"
                onChange={handleInputChange}
              />
            </FormControl>
            <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="neutral">
                Cancel
              </Button>
              <Button
                isLoading={isDeleting}
                onClick={handleDeleteGroup}
                colorScheme="primary"
                isDisabled={input !== props.groupName}
              >
                Delete group
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default DeleteGroupModal
