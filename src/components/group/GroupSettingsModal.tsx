import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Select as ChakraSelect } from 'chakra-react-select'
import React, { useEffect, useMemo, useState } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { AvailabilityBlock } from '@/types/availability'
import { GetGroupsFullResponse } from '@/types/Group'
import {
  editGroup,
  getGroupMemberAvailabilities,
  updateGroupMemberAvailabilities,
} from '@/utils/api_helper'
import { noClearCustomSelectComponent, Option } from '@/utils/constants/select'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

import DeleteGroupModal from './DeleteGroupModal'
import GroupAvatar from './GroupAvatar'
import GroupAvatarUpload from './GroupAvatarUpload'

export interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  group: GetGroupsFullResponse
  availabilityBlocks: AvailabilityBlock[]
  isAdmin: boolean
  resetState: () => Promise<void>
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  group,
  availabilityBlocks,
  isAdmin,
  resetState,
}) => {
  const groupId = group.id
  const currentAccount = useAccountContext()
  const { showSuccessToast } = useToastHelpers()
  const queryClient = useQueryClient()

  // Form state for user edits (initialized from React Query data)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [editedAvailabilityBlocks, setEditedAvailabilityBlocks] = useState<
    Array<Option<string>>
  >([])

  // Avatar upload state
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)
  const {
    isOpen: isAvatarModalOpen,
    onOpen: openAvatarModal,
    onClose: closeAvatarModal,
  } = useDisclosure()

  // Delete group modal
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal,
  } = useDisclosure()

  // Fetch current member's group-specific availability blocks
  const {
    data: groupMemberAvailabilities,
    isLoading: isLoadingGroupAvailabilities,
  } = useQuery<AvailabilityBlock[]>({
    queryKey: ['groupMemberAvailabilities', groupId, currentAccount?.address],
    queryFn: () =>
      getGroupMemberAvailabilities(groupId, currentAccount?.address || ''),
    enabled: isOpen && !!groupId && !!currentAccount?.address,
  })

  // Update group settings mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: {
      name?: string
      description?: string
      avatar_url?: string
    }) => {
      return editGroup(
        groupId,
        data.name,
        undefined,
        data.avatar_url,
        data.description
      )
    },
    onSuccess: async () => {
      await resetState()
      showSuccessToast(
        'Group settings updated',
        'Your changes have been saved successfully.'
      )
    },
    onError: (error: unknown) => {
      handleApiError('Error updating group settings', error)
    },
  })

  // Handle avatar upload success
  const handleAvatarChange = async (avatarUrl: string) => {
    setImageSrc(undefined)
    closeAvatarModal()

    // Invalidate queries to refresh data
    await resetState()

    showSuccessToast(
      'Avatar updated',
      'Your group avatar has been updated successfully.'
    )
  }

  // Update member availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (availabilityIds: string[]) => {
      return updateGroupMemberAvailabilities(
        groupId,
        currentAccount?.address || '',
        availabilityIds
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'groupMemberAvailabilities',
          groupId,
          currentAccount?.address,
        ],
      })
      await resetState()
      showSuccessToast(
        'Availability blocks updated',
        'Your availability blocks have been updated successfully.'
      )
    },
    onError: (error: unknown) => {
      handleApiError('Error updating availability blocks', error)
    },
  })

  // Initialize form values from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupName(group.name)
      setGroupDescription(group.description || '')
    }
  }, [isOpen, group.name, group.description])

  // Initialize edited availability blocks when data loads
  useEffect(() => {
    // If group-specific availability exists, use it
    if (groupMemberAvailabilities && groupMemberAvailabilities.length > 0) {
      setEditedAvailabilityBlocks(
        groupMemberAvailabilities.map(block => ({
          value: block.id,
          label: block.title,
        }))
      )
    } else if (
      // If no group-specific availability, prefill with default availability block
      groupMemberAvailabilities !== undefined &&
      availabilityBlocks &&
      currentAccount?.preferences?.availaibility_id
    ) {
      const defaultBlockId = currentAccount.preferences.availaibility_id
      const defaultBlock = availabilityBlocks.find(
        block => block.id === defaultBlockId
      )
      if (defaultBlock) {
        setEditedAvailabilityBlocks([
          {
            value: defaultBlock.id,
            label: defaultBlock.title,
          },
        ])
      }
    }
  }, [
    groupMemberAvailabilities,
    availabilityBlocks,
    currentAccount?.preferences?.availaibility_id,
  ])

  const availabilityBlockOptions: Option<string>[] =
    availabilityBlocks?.map(block => ({
      value: block.id,
      label: block.title,
    })) || []

  // Determine baseline availability IDs for comparison
  const baselineAvailabilityIds = useMemo(() => {
    // If group-specific availability exists, use it
    if (groupMemberAvailabilities && groupMemberAvailabilities.length > 0) {
      return groupMemberAvailabilities.map(b => b.id).sort()
    }
    // Otherwise, use default availability block if it exists
    if (currentAccount?.preferences?.availaibility_id) {
      return [currentAccount.preferences.availaibility_id]
    }
    return []
  }, [groupMemberAvailabilities, currentAccount?.preferences?.availaibility_id])

  const handleAvailabilityBlockChange = (newValue: unknown) => {
    const newSelected = (newValue as Option<string>[]) || []
    setEditedAvailabilityBlocks(newSelected)
  }

  const handleSave = async () => {
    // Update group settings if changed
    const hasNameChanged = groupName !== group.name
    const hasDescriptionChanged = groupDescription !== (group.description || '')

    if (hasNameChanged || hasDescriptionChanged) {
      await updateGroupMutation.mutateAsync({
        name: hasNameChanged ? groupName : undefined,
        description: hasDescriptionChanged ? groupDescription : undefined,
      })
    }

    // Update availability blocks if changed
    const newAvailabilityIds = editedAvailabilityBlocks.map(opt => opt.value)
    const hasAvailabilityChanged =
      baselineAvailabilityIds.length !== newAvailabilityIds.length ||
      !baselineAvailabilityIds.every(id => newAvailabilityIds.includes(id))

    if (hasAvailabilityChanged) {
      await updateAvailabilityMutation.mutateAsync(newAvailabilityIds)
    }

    onClose()
  }

  // Avatar upload handlers
  const handleImageSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          setImageSrc(reader.result as string)
          openAvatarModal()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleCloseAvatarModal = () => {
    setImageSrc(undefined)
    closeAvatarModal()
  }

  // Check if there are any changes compared to props data
  const hasChanges =
    groupName !== group.name ||
    groupDescription !== (group.description || '') ||
    baselineAvailabilityIds.join(',') !==
      editedAvailabilityBlocks
        .map(opt => opt.value)
        .sort()
        .join(',')

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Modal
        onClose={onClose}
        isOpen={isOpen}
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
            <Heading size={'md'}>Group settings</Heading>
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody p={'0'} mt={'6'}>
            <VStack gap={6} alignItems="stretch">
              {/* Avatar Section */}
              <FormControl>
                <HStack gap={4} alignItems="center">
                  <GroupAvatar
                    avatarUrl={group.avatar_url}
                    groupName={groupName}
                    boxSize="80px"
                  />
                  <VStack alignItems="flex-start" gap={0} flex={1}>
                    <Heading size="md" fontWeight="bold">
                      {groupName}
                    </Heading>
                    <Link
                      color="primary.200"
                      fontSize="sm"
                      fontWeight="600"
                      textDecoration="underline"
                      onClick={handleImageSelect}
                      cursor="pointer"
                      mt={1}
                      _hover={{
                        color: 'primary.300',
                      }}
                    >
                      Edit group ID picture
                    </Link>
                  </VStack>
                </HStack>
              </FormControl>

              {/* Group Name */}
              <FormControl>
                <FormLabel>Group name</FormLabel>
                <Input
                  type="text"
                  value={groupName}
                  _placeholder={{
                    color: 'neutral.400',
                  }}
                  borderColor="neutral.400"
                  placeholder="Enter group name"
                  onChange={e => setGroupName(e.target.value)}
                />
              </FormControl>

              {/* Description */}
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  value={groupDescription}
                  _placeholder={{
                    color: 'neutral.400',
                  }}
                  borderColor="neutral.400"
                  placeholder="Enter group description"
                  onChange={e => setGroupDescription(e.target.value)}
                  rows={3}
                />
              </FormControl>

              {/* Availability Blocks - Only for current user (not admin-only) */}
              {currentAccount?.address && (
                <FormControl>
                  <FormLabel>Your availability blocks for this group</FormLabel>
                  {isLoadingGroupAvailabilities ? (
                    <Spinner />
                  ) : (
                    <ChakraSelect
                      value={editedAvailabilityBlocks}
                      onChange={handleAvailabilityBlockChange}
                      options={availabilityBlockOptions}
                      isMulti
                      tagVariant={'solid'}
                      components={noClearCustomSelectComponent}
                      colorScheme="black"
                      chakraStyles={{
                        container: provided => ({
                          ...provided,
                          border: '1px solid',
                          borderColor: 'inherit',
                          borderRadius: 'md',
                          maxW: '100%',
                          display: 'block',
                          w: '100%',
                        }),
                        placeholder: provided => ({
                          ...provided,
                          textAlign: 'left',
                        }),
                      }}
                    />
                  )}
                </FormControl>
              )}

              {/* Action Buttons */}
              <HStack justifyContent="space-between" mt={'6'} w="100%">
                <Button
                  isLoading={
                    updateGroupMutation.isLoading ||
                    updateAvailabilityMutation.isLoading
                  }
                  onClick={handleSave}
                  colorScheme="primary"
                  isDisabled={!hasChanges}
                >
                  Save settings
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={openDeleteModal}
                    borderColor="red.500"
                    borderWidth={1}
                    color="red.500"
                    bg="transparent"
                    _hover={{
                      bg: 'transparent',
                      color: 'red.500',
                    }}
                  >
                    Delete group
                  </Button>
                )}
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Avatar Upload Modal */}
      <GroupAvatarUpload
        isDialogOpen={isAvatarModalOpen}
        onDialogClose={handleCloseAvatarModal}
        imageSrc={imageSrc}
        groupId={groupId}
        onAvatarChange={handleAvatarChange}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        groupID={groupId}
        groupName={groupName}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        resetState={async () => {
          await resetState()
          closeDeleteModal()
          onClose()
        }}
      />
    </>
  )
}

export default GroupSettingsModal
