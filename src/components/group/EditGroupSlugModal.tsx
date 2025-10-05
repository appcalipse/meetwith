import {
  Button,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'

import { editGroup } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

export interface IEditGroupNameModal {
  groupID: string | null
  resetState: () => Promise<void>
  onClose: () => void
  isOpen: boolean
  groupSlug: string | null
}

const EditGroupSlugModal: React.FC<IEditGroupNameModal> = props => {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [input, setInput] = useState('')
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value)
  useEffect(() => {
    if (props.groupSlug) {
      setInput(props.groupSlug)
    }
  }, [props.groupSlug])
  const handleEditGroupName = async () => {
    if (!props.groupID) return
    setIsUpdating(true)
    try {
      const isSuccessful = await editGroup(props.groupID, undefined, input)
      setIsUpdating(false)
      if (!isSuccessful) return
      await props.resetState()
      props.onClose()
    } catch (error: unknown) {
      handleApiError('Error changing slug', error)
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
          <Heading size={'md'}>Edit group slug</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <Text size={'base'}>
              Updating your group slug will be automatically reflected in the
              dashboards of all members.
            </Text>
            <InputGroup mt="2">
              <InputLeftAddon
                border={'1px solid #7B8794'}
                bg="transparent"
                borderRightWidth={0}
                borderColor="neutral.400 !important"
                pr={0}
              >
                meetwith.xyz/
              </InputLeftAddon>
              <Input
                placeholder="my-group-name"
                value={input}
                outline="none"
                _focusVisible={{
                  borderColor: 'neutral.400',
                  boxShadow: 'none',
                }}
                borderColor="neutral.400"
                borderLeftWidth={0}
                pl={0}
                _placeholder={{
                  color: 'neutral.400',
                }}
                onChange={handleInputChange}
              />
            </InputGroup>
            <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="neutral">
                Cancel
              </Button>
              <Button
                isLoading={isUpdating}
                onClick={handleEditGroupName}
                colorScheme="primary"
                isDisabled={input === props.groupSlug}
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

export default EditGroupSlugModal
