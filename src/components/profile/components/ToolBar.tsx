import {
  Box,
  Button,
  FormControl,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { type Editor } from '@tiptap/react'
import * as React from 'react'
import {
  BiBold,
  BiHeading,
  BiItalic,
  BiLink,
  BiListOl,
  BiListUl,
  BiStrikethrough,
} from 'react-icons/bi'
const Toggle = TogglePrimitive.Root

interface ToolBarProps {
  editor: Editor | null
}

const ToolBar: React.FC<ToolBarProps> = ({ editor }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const urlRegex = new RegExp(
    /((http|https):\/\/[a-zA-Z0-9\-\.\_]+\.[a-zA-Z]{2,3}(\/\S*)?)/
  )
  const [url, setUrl] = React.useState('')
  if (!editor) return null
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Link</ModalHeader>
          <ModalCloseButton />
          <FormControl padding={6}>
            <Text pb={2}>Selected Text URL</Text>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              type="text"
              placeholder="Title"
            />
          </FormControl>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={!urlRegex.test(url)}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .setLink({
                    href: url,
                    target: '_blank',
                  })
                  .run()
                onClose()
                setUrl('')
              }}
            >
              Set Link
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box
        width="100%"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        padding="10px"
      >
        <HStack justifyContent="space-between">
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            pressed={editor.isActive('heading', { level: 1 })}
          >
            <IconButton
              backgroundColor={
                editor.isActive('heading', { level: 1 })
                  ? 'blue.500'
                  : 'whiteAlpha.300'
              }
              aria-label="Toggle Heading"
              icon={<BiHeading />}
            />
          </Toggle>
          <Toggle
            asChild
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            pressed={editor.isActive('bold')}
          >
            <IconButton
              backgroundColor={
                editor.isActive('bold') ? 'blue.500' : 'whiteAlpha.300'
              }
              aria-label="Toggle Heading"
              icon={<BiBold />}
            />
          </Toggle>
          <Toggle
            asChild
            onPressedChange={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run()
              } else {
                onOpen()
              }
            }}
            pressed={editor.isActive('link')}
          >
            <IconButton
              backgroundColor={
                editor.isActive('link') ? 'blue.500' : 'whiteAlpha.300'
              }
              aria-label="Toggle Link"
              icon={<BiLink />}
            />
          </Toggle>
          <Toggle
            asChild
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            pressed={editor.isActive('italic')}
          >
            <IconButton
              aria-label="Toggle Italics"
              icon={<BiItalic />}
              backgroundColor={
                editor.isActive('italic') ? 'blue.500' : 'whiteAlpha.300'
              }
            />
          </Toggle>
          <Toggle
            asChild
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            pressed={editor.isActive('strike')}
          >
            <IconButton
              aria-label="Toggle Strikethrough"
              backgroundColor={
                editor.isActive('strike') ? 'blue.500' : 'whiteAlpha.300'
              }
              icon={<BiStrikethrough />}
            />
          </Toggle>

          <Toggle
            asChild
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            pressed={editor.isActive('bulletList')}
          >
            <IconButton
              aria-label="Toggle List"
              backgroundColor={
                editor.isActive('bulletList') ? 'blue.500' : 'whiteAlpha.300'
              }
              icon={<BiListUl />}
            />
          </Toggle>
          <Toggle
            asChild
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            pressed={editor.isActive('orderedList')}
          >
            <IconButton
              aria-label="Toggle Unordered List"
              backgroundColor={
                editor.isActive('orderedList') ? 'blue.500' : 'whiteAlpha.300'
              }
              icon={<BiListOl />}
            />
          </Toggle>
        </HStack>
      </Box>
    </>
  )
}

export default ToolBar
