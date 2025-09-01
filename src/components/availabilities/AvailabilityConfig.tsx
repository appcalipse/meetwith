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
import {
  useAvailabilityBlockHandlers,
  useAvailabilityBlocks,
  useAvailabilityForm,
} from '@/hooks/availability'
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
    showSelectDefaultModal,
    selectDefaultModalConfig,
    isSaving,
    handleCreateBlock,
    handleEditBlock,
    handleDuplicateBlock,
    handleClose,
    handleSaveNewBlock,
    handleDeleteBlock,
    handleShowDeleteConfirmation,
    handleCancelDelete,
    handleCloseSelectDefaultModal,
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
    existingBlocks: availabilityBlocks,
  })

  if (isLoading) {
    return <CustomLoading text="Loading your availability blocks..." />
  }

  return (
    <VStack
      alignItems="start"
      flex={1}
      mt={3}
      mb={8}
      spacing={6}
      width="100%"
      maxWidth="100%"
      px={{ base: 2, sm: 4, md: 6, lg: 4, xl: 6, '2xl': 10 }}
    >
      <Heading fontSize="2xl" color="neutral.0" width="100%">
        Availabilities
      </Heading>

      <Box
        width="100%"
        maxWidth={{
          base: '100%',
          sm: '100%',
          md: '100%',
          lg: '100%',
          xl: '1200px',
          '2xl': '1400px',
        }}
        padding={{ base: 4, sm: 6, md: 8, lg: 10, xl: 12, '2xl': 12 }}
        borderRadius={12}
        background="neutral.900"
        position="relative"
        mx="auto"
      >
        <Flex
          align="flex-start"
          justify="space-between"
          mb={4}
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 6, lg: 8 }}
          width="100%"
        >
          <Box
            width={{ base: '100%', md: 'auto' }}
            flex={{ md: 1 }}
            minWidth={0}
          >
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
            flexShrink={0}
            width={{ base: '100%', md: 'auto' }}
          >
            New Availability block
          </Button>
        </Flex>

        <Flex flexDirection="column" gap={6} mt={7} width="100%">
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
        onClose={handleClose}
        isEditing={isEditing}
        editingBlockId={editingBlockId}
        duplicatingBlockId={duplicatingBlockId}
        showDeleteConfirmation={showDeleteConfirmation}
        showSelectDefaultModal={showSelectDefaultModal}
        selectDefaultModalConfig={selectDefaultModalConfig || undefined}
        availableBlocks={availabilityBlocks}
        currentDefaultBlockId={editingBlockId || undefined}
        onCloseSelectDefaultModal={handleCloseSelectDefaultModal}
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
