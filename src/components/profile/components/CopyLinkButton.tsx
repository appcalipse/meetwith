import { Button, ButtonProps, Tooltip } from '@chakra-ui/react'
import { useState } from 'react'
import { FaLink } from 'react-icons/fa'

import { logEvent } from '../../../utils/analytics'

type CopyLinkButtonProps = {
  url: string
  label?: string
  withIcon?: boolean
} & ButtonProps

export const CopyLinkButton = ({
  url,
  label,
  withIcon,
  ...props
}: CopyLinkButtonProps) => {
  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false)

  const copyLink = async () => {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(url)
      } else {
        document.execCommand('copy', true, url)
      }
    } catch (err) {
      document.execCommand('copy', true, url)
    }
    logEvent('Copied link', { url })
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 2000)
  }
  return (
    <Tooltip label="Copied" placement="top" isOpen={copyFeedbackOpen}>
      <Button
        flex={1}
        color="primary.500"
        borderColor="primary.500"
        variant="outline"
        onClick={copyLink}
        {...(withIcon && { rightIcon: <FaLink /> })}
        {...props}
      >
        {label || 'Copy link'}
      </Button>
    </Tooltip>
  )
}
