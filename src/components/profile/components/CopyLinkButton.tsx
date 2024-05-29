import { Box, BoxProps, Button, ButtonProps, Tooltip } from '@chakra-ui/react'
import { useState } from 'react'
import { FaLink } from 'react-icons/fa'

import { logEvent } from '../../../utils/analytics'

type CopyLinkButtonProps = {
  url: string
  label?: string
  withIcon?: boolean
  design_type?: 'link' | 'button'
  childStyle?: BoxProps
} & ButtonProps

export const CopyLinkButton = ({
  url,
  label,
  withIcon,
  design_type = 'button',
  childStyle,
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
        variant={design_type === 'link' ? 'ghost' : 'outline'}
        px={design_type === 'link' ? 0 : 4}
        onClick={copyLink}
        style={{
          display: 'flex',
        }}
        {...(withIcon && { rightIcon: <FaLink /> })}
        {...props}
      >
        <Box {...childStyle}>{label || 'Copy link'}</Box>
      </Button>
    </Tooltip>
  )
}
