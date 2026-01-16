declare module '@tawk.to/tawk-messenger-react' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react'

  type TawkStatus = 'online' | 'away' | 'offline'
  type TawkWindowType = 'inline' | 'popup'

  interface TawkStatusChangeData {
    status: TawkStatus
  }

  interface TawkMessageData {
    message: string
    timestamp: number
  }

  interface TawkAgentData {
    name: string
    id: string
  }

  interface TawkVisitorData {
    name?: string
    email?: string
    [key: string]: unknown
  }

  interface TawkSatisfactionData {
    rating: number
    comment?: string
  }

  interface TawkFileUploadData {
    url: string
    name: string
  }

  interface TawkTagsData {
    tags: string[]
  }

  interface TawkUnreadCountData {
    count: number
  }

  interface TawkSwitchWidgetOptions {
    propertyId: string
    widgetId: string
  }

  // Props interface
  interface TawkMessengerProps {
    // Required props
    propertyId: string
    widgetId: string

    // Optional props
    customStyle?: Record<string, unknown>
    embedId?: string
    basePath?: string
    autoStart?: boolean

    // Event callbacks
    tawkOnLoad?: () => void
    tawkOnStatusChange?: (data: TawkStatusChangeData) => void
    tawkOnBeforeLoad?: () => void
    tawkOnChatMaximized?: () => void
    tawkOnChatMinimized?: () => void
    tawkOnChatHidden?: () => void
    tawkOnChatStarted?: () => void
    tawkOnChatEnded?: () => void
    tawkOnPrechatSubmit?: (data: unknown) => void
    tawkOnOfflineSubmit?: (data: unknown) => void
    tawkOnChatMessageVisitor?: (data: TawkMessageData) => void
    tawkOnChatMessageAgent?: (data: TawkMessageData) => void
    tawkOnChatMessageSystem?: (data: TawkMessageData) => void
    tawkOnAgentJoinChat?: (data: TawkAgentData) => void
    tawkOnAgentLeaveChat?: (data: TawkAgentData) => void
    tawkOnChatSatisfaction?: (data: TawkSatisfactionData) => void
    tawkOnVisitorNameChanged?: (data: { name: string }) => void
    tawkOnFileUpload?: (data: TawkFileUploadData) => void
    tawkOnTagsUpdated?: (data: TawkTagsData) => void
    tawkOnUnreadCountChanged?: (data: TawkUnreadCountData) => void
  }

  interface TawkMessengerRef {
    tawkStart(): void
    tawkShutdown(): void
    tawkMaximize(): void
    tawkMinimize(): void
    tawkToggle(): void
    tawkPopup(): void
    tawkShowWidget(): void
    tawkHideWidget(): void
    tawkToggleVisibility(): void
    tawkEndChat(): void

    tawkGetWindowType(): TawkWindowType
    tawkGetStatus(): TawkStatus
    tawkIsChatMaximized(): boolean
    tawkIsChatMinimized(): boolean
    tawkIsChatHidden(): boolean
    tawkIsChatOngoing(): boolean
    tawkIsVisitorEngaged(): boolean
    tawkOnLoaded(): unknown
    tawkOnBeforeLoaded(): unknown
    tawkWidgetPosition(): unknown

    tawkVisitor(data: TawkVisitorData): void
    tawkSetAttributes(
      attribute: Record<string, unknown>,
      callback?: () => void
    ): void
    tawkAddEvent(event: string, metadata?: unknown, callback?: () => void): void
    tawkAddTags(tags: string[], callback?: () => void): void
    tawkRemoveTags(tags: string[], callback?: () => void): void
    tawkSwitchWidget(
      options: TawkSwitchWidgetOptions,
      callback?: () => void
    ): void
  }

  type TawkMessengerComponent = ForwardRefExoticComponent<
    TawkMessengerProps & RefAttributes<TawkMessengerRef>
  >

  const TawkMessenger: TawkMessengerComponent

  export default TawkMessenger
  export type {
    TawkMessengerProps,
    TawkMessengerRef,
    TawkStatus,
    TawkSwitchWidgetOptions,
    TawkVisitorData,
    TawkWindowType,
  }
}
