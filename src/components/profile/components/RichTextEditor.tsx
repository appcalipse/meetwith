import { VStack } from '@chakra-ui/react'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { Link } from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import * as React from 'react'

import ToolBar from './ToolBar'

interface RichTextEditorProps {
  onValueChange?: (content: string) => void
  value?: string
  placeholder?: string
  id?: string
  isDisabled?: boolean
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onValueChange,
  placeholder,
  value,
  id,
  isDisabled,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: {
          HTMLAttributes: {
            style: 'margin: 0.5rem 1.5rem',
          },
        },
        bulletList: {
          HTMLAttributes: {
            style: 'margin: 0.5rem 1.5rem',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: `text-decoration: underline; color: #F46739;`,
        },
      }),
      BubbleMenu.configure({
        shouldShow: ({ editor }) => {
          // only show the bubble menu for images and links
          return editor.isActive('link')
        },
      }),
      Underline,
      Placeholder.configure({
        emptyEditorClass: 'is-editor-empty',
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate({ editor }) {
      if (isDisabled) return
      onValueChange?.(editor.getHTML())
    },
    editable: !isDisabled,
  })

  return (
    <VStack
      justifyItems="stretch"
      gap={0}
      borderRadius="6px"
      border="2px solid transparent"
      _focus={{
        border: '2px solid #32ADE6',
      }}
      _focusWithin={{
        border: '2px solid #32ADE6',
      }}
      maxW="100%"
    >
      <ToolBar editor={editor} />
      <EditorContent
        suppressHydrationWarning
        className="custom-editor"
        placeholder={placeholder}
        editor={editor}
        id={id}
      />
    </VStack>
  )
}
export default RichTextEditor
