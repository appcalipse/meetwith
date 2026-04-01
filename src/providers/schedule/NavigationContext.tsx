import { useRouter } from 'next/router'
import React, { createContext, ReactNode, useContext, useState } from 'react'

export enum Page {
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}
interface INavigationContext {
  handlePageSwitch: (page: Page) => void
  currentPage: Page
  inviteModalOpen: boolean
  setInviteModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}
const DEFAULT_CONTEXT = {
  currentPage: Page.SCHEDULE_TIME,
  handlePageSwitch: () => {},
  inviteModalOpen: false,
  setInviteModalOpen: () => {},
}

const NavigationContext = createContext<INavigationContext>(DEFAULT_CONTEXT)

export const useScheduleNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error(
      'useScheduleNavigation must be used within NavigationProvider'
    )
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
  /** When set, overrides router-derived initial tab (e.g. guest poll schedule details). */
  initialPage?: Page
  /**
   * When set, navigating to the availability tab (e.g. Back / pick another time)
   * runs this instead of showing the time tab — used for embedded guest flows.
   */
  onRequestScheduleTimePage?: () => void
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  initialPage: initialPageOverride,
  onRequestScheduleTimePage,
}) => {
  const router = useRouter()
  const { intent } = router.query

  const initialPageFromRouter =
    intent === 'schedule_from_poll' ? Page.SCHEDULE_DETAILS : Page.SCHEDULE_TIME

  const [currentPage, setCurrentPage] = useState<Page>(
    initialPageOverride ?? initialPageFromRouter
  )
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const handlePageSwitch = (page: Page) => {
    if (page === Page.SCHEDULE_TIME && onRequestScheduleTimePage) {
      onRequestScheduleTimePage()
      return
    }
    setCurrentPage(page)
  }

  const value = {
    currentPage,
    handlePageSwitch,
    inviteModalOpen,
    setInviteModalOpen,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
