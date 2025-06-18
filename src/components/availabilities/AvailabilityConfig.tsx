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

import CustomLoading from '@/components/CustomLoading'
import { useAvailabilityBlockHandlers } from '@/hooks/useAvailabilityBlockHandlers'
import { useAvailabilityBlocks } from '@/hooks/useAvailabilityBlocks'
import { useAvailabilityForm } from '@/hooks/useAvailabilityForm'
import { Account } from '@/types/Account'
import { UseAvailabilityBlocksResult } from '@/types/availability'

import { AvailabilityBlockCard } from './AvailabilityBlockCard'
import { AvailabilityEmptyState } from './AvailabilityEmptyState'
import { AvailabilityModal } from './AvailabilityModal'

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const {
    blocks: availabilityBlocks,
    isLoading,
    isFetching,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  } = useAvailabilityBlocks(
    currentAccount?.address
  ) as UseAvailabilityBlocksResult

  const {
    formState,
    resetForm,
    updateAvailability,
    setTitle,
    setTimezone,
    setIsDefault,
  } = useAvailabilityForm(currentAccount)

  const {
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    handleCreateBlock,
    handleEditBlock,
    handleDuplicateBlock,
    handleClose,
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
  })

  if (isLoading || isFetching) {
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
              <Text as="span" color="primary.200" textDecoration="underline">
                groups
              </Text>{' '}
              and{' '}
              <Text as="span" color="primary.200" textDecoration="underline">
                session types
              </Text>{' '}
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
        onClose={handleClose}
        isEditing={isEditing}
        editingBlockId={editingBlockId}
        duplicatingBlockId={duplicatingBlockId}
        showDeleteConfirmation={showDeleteConfirmation}
        formState={formState}
        onTitleChange={setTitle}
        onTimezoneChange={setTimezone}
        onAvailabilityChange={updateAvailability}
        onIsDefaultChange={setIsDefault}
        onSave={handleSaveNewBlock}
        onDelete={handleDeleteBlock}
        onCancelDelete={handleCancelDelete}
        onShowDeleteConfirmation={handleShowDeleteConfirmation}
        isLoading={
          createBlock.isLoading ||
          updateBlock.isLoading ||
          duplicateBlock.isLoading ||
          deleteBlock.isLoading
        }
        currentEditingBlock={availabilityBlocks?.find(
          block => block.id === editingBlockId
        )}
      />
    </VStack>
  )
}

export default AvailabilityConfig
