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

import { editGroup } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'

export interface IEditGroupNameModal {
  groupID: string | null
  resetState: () => void
  onClose: () => void
  isOpen: boolean
  groupName: string | null
}

const EditGroupNameModal: React.FC<IEditGroupNameModal> = props => {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [input, setInput] = useState('')
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value)
  const toast = useToast()
  const { push } = useRouter()
  useEffect(() => {
    if (props.groupName) {
      setInput(props.groupName)
    }
  }, [props.groupName])
  const handleEditGroupName = async () => {
    if (!props.groupID) return
    setIsUpdating(true)
    try {
      const isSuccessful = await editGroup(props.groupID, input)
      setIsUpdating(false)
      if (!isSuccessful) return
      props.resetState()
      props.onClose()
    } catch (error: any) {
      const isJsonErr = isJson(error.message)
      const errorMessage = isJsonErr
        ? JSON.parse(error.message)?.error
        : error.message
      toast({
        title: 'Error deleting group',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
    setIsUpdating(false)
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
          <Heading size={'md'}>Edit group name</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              Updating your group name will be automatically reflected in the
              dashboards of all members.
            </Text>
            <Input
              type="text"
              value={input}
              _placeholder={{
                color: 'neutral.400',
              }}
              borderColor="neutral.400"
              placeholder="Enter group name"
              onChange={handleInputChange}
            />
            <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="grayButton">
                Cancel
              </Button>
              <Button
                isLoading={isUpdating}
                onClick={handleEditGroupName}
                colorScheme="primary"
                isDisabled={input === props.groupName}
              >
                Update
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default EditGroupNameModal
