import { useState } from 'react'

export const useAvailabilityBlockUIState = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [duplicatingBlockId, setDuplicatingBlockId] = useState<string | null>(
    null
  )
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const resetUIState = () => {
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
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
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    isSaving,
    setIsSaving,
    resetUIState,
    setEditingState,
    setDuplicatingState,
    setCreateState,
    setShowDeleteConfirmation,
  }
}
