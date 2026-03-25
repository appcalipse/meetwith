import { useEffect, useRef } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { migrateGuestPolls } from '@/utils/api_helper'
import { clearGuestIdentifier, getGuestIdentifier } from '@/utils/storage'

/**
 * Automatically migrates guest-created polls to the authenticated user's account.
 * Runs once after auth is detected and a guest_identifier exists in localStorage.
 */
export const useGuestMigration = () => {
  const currentAccount = useAccountContext()
  const hasMigrated = useRef(false)

  useEffect(() => {
    if (!currentAccount?.address || hasMigrated.current) return

    const guestId = getGuestIdentifier()
    if (!guestId) return

    hasMigrated.current = true

    migrateGuestPolls(guestId)
      .then(() => {
        clearGuestIdentifier()
      })
      .catch(err => {
        console.error('Failed to migrate guest polls:', err)
        hasMigrated.current = false
      })
  }, [currentAccount?.address])
}
