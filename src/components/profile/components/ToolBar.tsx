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
  PopoverContent,
  PopoverTrigger,
  Text,
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
  const getSelectedText = React.useCallback(() => {
    if (!editor) return ''
    const { from, to, empty } = editor.state.selection
    if (empty) return ''
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])
  if (!editor) return null
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
          <Popover
            returnFocusOnClose={false}
            isOpen={isOpen}
            onClose={onClose}
            placement="right"
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <Toggle
                asChild
                onPressedChange={() => {
                  onOpen()
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
            </PopoverTrigger>
            <PopoverContent zIndex={99}>
              <PopoverArrow />
              <PopoverBody>
                <Flex>
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    type="text"
                    placeholder="Placeholder Url"
                  />
                  <Button
                    variant="text"
                    disabled={!urlRegex.test(url)}
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setLink({
                          href: url,
                        })
                        .run()
                      onClose()
                      setUrl('')
                    }}
                  >
                    Save
                  </Button>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </Popover>
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
      <BubbleMenu
        editor={editor as Editor}
        tippyOptions={{ duration: 100, trigger: 'manual' }}
        // shouldShow={editor => editor.editor.isActive('link')}
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
