import { useState } from 'react'

export const useAvailabilityBlockUIState = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [duplicatingBlockId, setDuplicatingBlockId] = useState<string | null>(
    null
  )
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showSelectDefaultModal, setShowSelectDefaultModal] = useState(false)
  const [selectDefaultModalConfig, setSelectDefaultModalConfig] = useState<{
    title: string
    description: string
    confirmButtonText: string
    onConfirm: (selectedBlockId: string) => void
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const resetUIState = () => {
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
    setShowSelectDefaultModal(false)
    setSelectDefaultModalConfig(null)
    setIsSaving(false)
  }

  const setEditingState = (blockId: string) => {
    setIsEditing(true)
    setEditingBlockId(blockId)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
  }

  const setDuplicatingState = (blockId: string) => {
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(blockId)
    setShowDeleteConfirmation(false)
  }

  const setCreateState = () => {
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
  }

  return {
    duplicatingBlockId,
    editingBlockId,
    isEditing,
    isSaving,
    resetUIState,
    selectDefaultModalConfig,
    setCreateState,
    setDuplicatingState,
    setEditingState,
    setIsSaving,
    setSelectDefaultModalConfig,
    setShowDeleteConfirmation,
    setShowSelectDefaultModal,
    showDeleteConfirmation,
    showSelectDefaultModal,
  }
}
