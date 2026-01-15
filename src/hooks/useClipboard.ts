import { useState } from 'react'

import { logEvent } from '@/utils/analytics'

const useClipboard = () => {
  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)
  const handleCopy = async (meeting_url: string) => {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(meeting_url || '')
      } else {
        document.execCommand('copy', true, meeting_url || '')
      }
    } catch (_err) {
      document.execCommand('copy', true, meeting_url || '')
    }
    logEvent('Copied link from Calendar', { url: meeting_url || '' })
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 2000)
  }
  return { copyFeedbackOpen, handleCopy }
}

export default useClipboard
