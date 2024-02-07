import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { type Editor, BubbleMenu } from '@tiptap/react'
import Link from 'next/link'
import * as React from 'react'
import {
  BiBold,
  BiHeading,
  BiItalic,
  BiLink,
  BiListOl,
  BiListUl,
  BiStrikethrough,
  BiUnderline,
  BiX,
} from 'react-icons/bi'

import { isValidUrl } from '../../../utils/validations'
const Toggle = TogglePrimitive.Root

interface ToolBarProps {
  editor: Editor | null
}

const ToolBar: React.FC<ToolBarProps> = ({ editor }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [url, setUrl] = React.useState('')
  const getSelectedText = React.useCallback(() => {
    if (!editor) return ''
    const { from, to, empty } = editor.state.selection
    if (empty) return ''
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])
  if (!editor) return null
  const handleUrlSave = () => {
    if (!isValidUrl(url)) return
    editor
      .chain()
      .focus()
      .setLink({
        href: url,
      })
      .run()
    onClose()
    setUrl('')
  }
  return (
    <>
      <Box
        width="100%"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        padding="10px"
      >
        <HStack justifyContent="space-between">
          <Tooltip
            hasArrow
            placement="top"
            label="Bold"
            aria-label="A tooltip for bold"
          >
            <Toggle
              asChild
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              pressed={editor.isActive('bold')}
            >
              <IconButton
                backgroundColor={
                  editor.isActive('bold') ? 'primary.400' : 'whiteAlpha.300'
                }
                aria-label="Toggle Bold"
                icon={<BiBold />}
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Italics"
            aria-label="A tooltip for the link"
          >
            <Toggle
              asChild
              onPressedChange={() =>
                editor.chain().focus().toggleItalic().run()
              }
              pressed={editor.isActive('italic')}
            >
              <IconButton
                aria-label="Toggle Italics"
                icon={<BiItalic />}
                backgroundColor={
                  editor.isActive('italic') ? 'primary.400' : 'whiteAlpha.300'
                }
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Underline"
            aria-label="A tooltip"
          >
            <Toggle
              onPressedChange={() =>
                editor.chain().focus().toggleUnderline().run()
              }
              pressed={editor.isActive('underline')}
              asChild
            >
              <IconButton
                backgroundColor={
                  editor.isActive('underline')
                    ? 'primary.400'
                    : 'whiteAlpha.300'
                }
                aria-label="Toggle Underline"
                icon={<BiUnderline />}
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Strikethrough"
            aria-label="A tooltip for the strikethrough"
          >
            <Toggle
              asChild
              onPressedChange={() =>
                editor.chain().focus().toggleStrike().run()
              }
              pressed={editor.isActive('strike')}
            >
              <IconButton
                aria-label="Toggle Strikethrough"
                backgroundColor={
                  editor.isActive('strike') ? 'primary.400' : 'whiteAlpha.300'
                }
                icon={<BiStrikethrough />}
              />
            </Toggle>
          </Tooltip>
          <Popover
            returnFocusOnClose={false}
            isOpen={isOpen}
            onClose={onClose}
            placement="top-start"
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <Tooltip
                hasArrow
                placement="top"
                label="Create A Link"
                aria-label="A tooltip for the link"
              >
                <Toggle
                  asChild
                  onPressedChange={() => {
                    onOpen()
                  }}
                  pressed={editor.isActive('link')}
                >
                  <IconButton
                    backgroundColor={
                      editor.isActive('link') ? 'primary.400' : 'whiteAlpha.300'
                    }
                    aria-label="Toggle Link"
                    icon={<BiLink />}
                  />
                </Toggle>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent zIndex={99}>
              <PopoverArrow />
              <PopoverBody>
                <Flex alignItems="center" gap={4}>
                  <BiX cursor="pointer" size={'2em'} onClick={onClose} />
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    type="text"
                    placeholder="Placeholder Url"
                    aria-label="Url"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleUrlSave()
                      }
                    }}
                    onKeyUp={e => {
                      if (e.key === 'Escape') {
                        onClose()
                      }
                    }}
                    width="100%"
                  />
                  <Button
                    variant="outline"
                    disabled={!isValidUrl(url)}
                    onClick={handleUrlSave}
                    aria-label="Save"
                    backgroundColor="primary.400"
                  >
                    Save
                  </Button>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Tooltip
            hasArrow
            placement="top"
            label="Create an unordered list"
            aria-label="A tooltip for the link"
          >
            <Toggle
              asChild
              onPressedChange={() =>
                editor.chain().focus().toggleBulletList().run()
              }
              pressed={editor.isActive('bulletList')}
            >
              <IconButton
                aria-label="Toggle Unordered List"
                backgroundColor={
                  editor.isActive('bulletList')
                    ? 'primary.400'
                    : 'whiteAlpha.300'
                }
                icon={<BiListUl />}
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Ordered list"
            aria-label="A tooltip for the link"
          >
            <Toggle
              asChild
              onPressedChange={() =>
                editor.chain().focus().toggleOrderedList().run()
              }
              pressed={editor.isActive('orderedList')}
            >
              <IconButton
                aria-label="Toggle List"
                backgroundColor={
                  editor.isActive('orderedList')
                    ? 'primary.400'
                    : 'whiteAlpha.300'
                }
                icon={<BiListOl />}
              />
            </Toggle>
          </Tooltip>
        </HStack>
      </Box>
      <BubbleMenu
        editor={editor as Editor}
        tippyOptions={{
          duration: 100,
          trigger: 'manual',
          theme: 'material',
          placement: 'top-start',
          animateFill: true,
        }}
        shouldShow={editor => editor.editor.isActive('link')}
        className="floating-menu"
      >
        <Flex
          backgroundColor="whiteAlpha.300"
          paddingX={4}
          paddingY={2}
          borderRadius={6}
          gap={10}
        >
          <Link href={editor.getAttributes('link').href ?? ''} target="_blank">
            <Text color="blue.100">{getSelectedText()}</Text>
          </Link>
          <Button
            onClick={() => {
              onOpen()
              setUrl(editor.getAttributes('link').href ?? '')
            }}
            variant="link"
            textDecoration="none"
          >
            Edit
          </Button>
          <Button
            onClick={() => {
              editor.chain().focus().unsetLink().run()
              onClose()
            }}
            variant="link"
            textDecoration="none"
          >
            Remove
          </Button>
        </Flex>
      </BubbleMenu>
    </>
  )
}

export default ToolBar
