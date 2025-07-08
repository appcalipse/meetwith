import { AddIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import { useAvailabilityBlockHandlers } from '@/hooks/useAvailabilityBlockHandlers'
import { useAvailabilityBlocks } from '@/hooks/useAvailabilityBlocks'
import { useAvailabilityForm } from '@/hooks/useAvailabilityForm'
import { Account } from '@/types/Account'
import { updateAvailabilityBlockMeetingTypes } from '@/utils/api_helper'

import { AvailabilityBlockCard } from './AvailabilityBlockCard'
import { AvailabilityEmptyState } from './AvailabilityEmptyState'
import { AvailabilityModal } from './AvailabilityModal'

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedMeetingTypeIds, setSelectedMeetingTypeIds] = useState<
    string[]
  >([])

  const {
    blocks: availabilityBlocks,
    isLoading,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  } = useAvailabilityBlocks(currentAccount?.address)

  const {
    formState,
    resetForm,
    updateAvailability,
    setTitle,
    setTimezone,
    setIsDefault,
  } = useAvailabilityForm(currentAccount)

  const handleMeetingTypesChange = (meetingTypeIds: string[]) => {
    setSelectedMeetingTypeIds(meetingTypeIds)
  }

  const handleMeetingTypesSave = async (blockId: string) => {
    await updateAvailabilityBlockMeetingTypes({
      availability_block_id: blockId,
      meeting_type_ids: selectedMeetingTypeIds,
    })
    setSelectedMeetingTypeIds([])
  }

  const handleSaveWithMeetingTypes = async () => {
    await handleSaveNewBlock()
  }

  const {
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    isSaving,
    handleCreateBlock,
    handleEditBlock,
    handleDuplicateBlock,
    // handleClose,
    handleSaveNewBlock,
    handleDeleteBlock,
    handleShowDeleteConfirmation,
    handleCancelDelete,
  } = useAvailabilityBlockHandlers({
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    formState,
    resetForm,
    setTitle,
    setTimezone,
    updateAvailability,
    setIsDefault,
    onOpen,
    onClose,
    onMeetingTypesSave: handleMeetingTypesSave,
  })

  if (isLoading) {
    return <CustomLoading text="Loading your availability blocks..." />
  }

  return (
    <VStack alignItems="start" flex={1} mb={8} spacing={6}>
      <Heading fontSize="2xl" color="neutral.0">
        My Availability
      </Heading>

      <Box
        width={{ base: '100%', md: '100%', lg: 880 }}
        padding={{ base: 4, md: 6, lg: 8 }}
        borderRadius={12}
        background="neutral.900"
        position="relative"
      >
        <Flex
          align="flex-start"
          justify="space-between"
          mb={4}
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 0 }}
        >
          <Box width={{ base: '100%', md: 533 }}>
            <Heading fontSize={{ base: 18, md: 22 }} color="neutral.0" mb={2}>
              Availability blocks
            </Heading>
            <Text color="neutral.0" fontSize={{ base: 14, md: 16 }}>
              Define when you&apos;re free to meet. Different{' '}
              <Link href="/dashboard/groups">
                <Text
                  as="span"
                  color="primary.200"
                  textDecoration="underline"
                  cursor="pointer"
                >
                  groups
                </Text>
              </Link>{' '}
              and{' '}
              <Link href="/dashboard/meeting-settings">
                <Text
                  as="span"
                  color="primary.200"
                  textDecoration="underline"
                  cursor="pointer"
                >
                  session types
                </Text>
              </Link>{' '}
              can use different availability blocks.
            </Text>
          </Box>
          <Button
            leftIcon={<AddIcon color="neutral.800" />}
            colorScheme="orange"
            bg="primary.200"
            color="neutral.800"
            _hover={{ bg: 'primary.200' }}
            onClick={handleCreateBlock}
            fontSize="sm"
            px={6}
          >
            New Availability block
          </Button>
        </Flex>

        <Flex flexDirection="column" gap={6} flexWrap="wrap" mt={7}>
          {availabilityBlocks?.length === 0 ? (
            <AvailabilityEmptyState onCreateBlock={handleCreateBlock} />
          ) : (
            availabilityBlocks?.map(block => (
              <AvailabilityBlockCard
                key={block.id}
                block={block}
                onEdit={handleEditBlock}
                onDuplicate={handleDuplicateBlock}
              />
            ))
          )}
        </Flex>
      </Box>

      <AvailabilityModal
        isOpen={isOpen}
        onClose={onClose}
        isEditing={isEditing}
        editingBlockId={editingBlockId}
        duplicatingBlockId={duplicatingBlockId}
        showDeleteConfirmation={showDeleteConfirmation}
        formState={formState}
        onTitleChange={setTitle}
        onTimezoneChange={setTimezone}
        onAvailabilityChange={updateAvailability}
        onIsDefaultChange={setIsDefault}
        onSave={handleSaveWithMeetingTypes}
        onDelete={handleDeleteBlock}
        onCancelDelete={handleCancelDelete}
        onShowDeleteConfirmation={handleShowDeleteConfirmation}
        isLoading={
          createBlock.isLoading ||
          updateBlock.isLoading ||
          duplicateBlock.isLoading ||
          deleteBlock.isLoading ||
          isSaving
        }
        currentEditingBlock={availabilityBlocks?.find(
          block => block.id === editingBlockId
        )}
        onMeetingTypesChange={handleMeetingTypesChange}
      />
    </VStack>
  )
}

export default AvailabilityConfig
