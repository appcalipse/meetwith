import { VStack } from '@chakra-ui/react'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { Link } from '@tiptap/extension-link'
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
}
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onValueChange,
  placeholder,
  value,
  id,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: {
          HTMLAttributes: {
            style: 'margin: 0.5rem',
          },
        },
        bulletList: {
          HTMLAttributes: {
            style: 'margin: 0.5rem',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      BubbleMenu.configure({
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          // only show the bubble menu for images and links
          return editor.isActive('link')
        },
      }),
      Underline,
    ],
    content: value,
    onUpdate({ editor }) {
      onValueChange?.(editor.getHTML())
    },
  })

  return (
    <VStack justifyItems="stretch">
      <ToolBar editor={editor} />
      <EditorContent
        className="custom-editor"
        placeholder={placeholder}
        editor={editor}
        id={id}
      />
    </VStack>
  )
}
export default RichTextEditor
