import { Button, ButtonProps, Tooltip } from '@chakra-ui/react'
import { useState } from 'react'
import { FaLink } from 'react-icons/fa'

import { logEvent } from '../../../utils/analytics'

type CopyLinkButtonProps = {
  url: string
  label?: string
  withIcon?: boolean
  type?: 'button' | 'link'
} & ButtonProps

export const CopyLinkButton = ({
  url,
  label,
  withIcon,
  type = 'button',
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
    <Tooltip label="Link copied" placement="top" isOpen={copyFeedbackOpen}>
      <Button
        flex={1}
        colorScheme="primary"
        variant={type === 'button' ? 'outline' : 'ghost'}
        px={type === 'button' ? 4 : 0}
        onClick={copyLink}
        {...(withIcon && { rightIcon: <FaLink /> })}
        {...props}
      >
        {label || 'Copy link'}
      </Button>
    </Tooltip>
  )
}
