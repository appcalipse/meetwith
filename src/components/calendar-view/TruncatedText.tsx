import { Text } from '@chakra-ui/react'
import React, { useEffect, useRef, useState } from 'react'
import sanitizeHtml from 'sanitize-html'

interface TruncatedTextProps {
  content: string
  maxHeight: string
  [key: string]: unknown // For other props
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  content,
  maxHeight,
  ...props
}) => {
  const [truncatedContent, setTruncatedContent] = useState(content)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const maxHeightPx = parseInt(maxHeight)

    if (element.scrollHeight <= maxHeightPx) {
      setTruncatedContent(content)
      return
    }

    let start = 0
    let end = content.length
    let bestFit = content

    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      const testContent = content.substring(0, mid) + '...'

      element.innerHTML = testContent

      if (element.scrollHeight <= maxHeightPx) {
        bestFit = testContent
        start = mid + 1
      } else {
        end = mid - 1
      }
    }

    setTruncatedContent(bestFit)
  }, [content, maxHeight])

  return (
    <Text
      className="rich-text-wrapper"
      maxH={maxHeight}
      overflow="hidden"
      ref={textRef}
      {...props}
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(truncatedContent, {
          allowedTags: [
            'a',
            'p',
            'br',
            'strong',
            'em',
            'u',
            'ul',
            'ol',
            'li',
            'span',
            'div',
          ],
          allowedAttributes: { a: ['href', 'target', 'rel'] },
          transformTags: {
            a: (tagName, attribs) => ({
              tagName,
              attribs: {
                ...attribs,
                target: '_blank',
                rel: 'noopener noreferrer',
              },
            }),
          },
          textFilter: text => text.trimStart(),
        })
          .replace(/^(<br\s*\/?>|\s)+/i, '') // Remove leading breaks/whitespace
          .replace(/(<br\s*\/?>|\s)+$/i, '') // Remove trailing breaks/whitespace
          .replace(/(<br\s*\/?>){3,}/gi, '<br><br>'), // Collapse excessive line breaks
      }}
    />
  )
}
