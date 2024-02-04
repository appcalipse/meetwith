import { VStack } from '@chakra-ui/react'
import { Link } from '@tiptap/extension-link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import * as React from 'react'

import ToolBar from './ToolBar'
interface RichTextEditorProps {
  onValueChange?: (content: string) => void
  value?: string
  placeholder?: string
}
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onValueChange,
  placeholder,
  value,
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
      Link.configure(),
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
      />
    </VStack>
  )
}
export default RichTextEditor
