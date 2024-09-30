import {
  Box,
  Button,
  Flex,
  Heading,
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
  Popover,
  PopoverArrow,
  PopoverBody,
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
  BiAlignJustify,
  BiAlignLeft,
  BiAlignMiddle,
  BiAlignRight,
  BiBold,
  BiItalic,
  BiLink,
  BiListOl,
  BiListUl,
  BiStrikethrough,
  BiUnderline,
} from 'react-icons/bi'
import { FaRemoveFormat } from 'react-icons/fa'

import { isValidUrl } from '../../../utils/validations'
import InfoTooltip from './Tooltip'
const Toggle = TogglePrimitive.Root

interface ToolBarProps {
  editor: Editor | null
}

const ToolBar: React.FC<ToolBarProps> = ({ editor }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [url, setUrl] = React.useState('')
  const renderAlignIcon = React.useCallback(() => {
    switch (true) {
      case editor!.isActive({ textAlign: 'right' }):
        return <BiAlignRight size={25} />
      case editor!.isActive({ textAlign: 'left' }):
        return <BiAlignLeft size={25} />
      case editor!.isActive({ textAlign: 'center' }):
        return <BiAlignMiddle size={25} />
      default:
        return <BiAlignJustify size={25} />
    }
  }, [editor])
  if (!editor) return 'Loading...'
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
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack gap="6px" alignItems="center">
              <Heading size={'md'}>Edit URL</Heading>
              <InfoTooltip text="Add a link to the selected text" />
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              aria-label="url-input"
              type="text"
              placeholder="Where should this link go?"
              _placeholder={{
                color: '#7B8794',
              }}
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
            />
          </ModalBody>
          <ModalFooter>
            <HStack gap={2} marginLeft="auto">
              <Button
                colorScheme="white"
                variant="link"
                mr={3}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                isDisabled={!isValidUrl(url)}
                _disabled={{
                  backgroundColor: '#CBD2D9',
                  color: '#9AA5B1',
                  cursor: 'not-allowed',
                  _hover: {
                    backgroundColor: '#CBD2D9',
                    color: '#9AA5B1',
                  },
                }}
                onClick={handleUrlSave}
                colorScheme="primary"
                padding="8px 36px"
                aria-label="save-url"
              >
                OK
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box
        width="100%"
        borderWidth="1px"
        borderRadius="lg"
        borderBottom="0"
        borderBottomRadius="0"
        overflow="hidden"
        paddingBlock="5px"
        paddingInline="12px"
        className="tiptap-toolbar"
        overflowX="scroll"
        maxWidth="90vw"
      >
        <HStack gap="5px">
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
                aria-label="Toggle Bold"
                backgroundColor={
                  !editor.isActive('bold') ? 'transparent' : 'whiteAlpha.300'
                }
                icon={<BiBold size={25} />}
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
                icon={<BiItalic size={25} />}
                backgroundColor={
                  !editor.isActive('italic') ? 'transparent' : 'whiteAlpha.300'
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
                  !editor.isActive('underline')
                    ? 'transparent'
                    : 'whiteAlpha.300'
                }
                aria-label="Toggle Underline"
                icon={<BiUnderline size={25} />}
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
                  !editor.isActive('strike') ? 'transparent' : 'whiteAlpha.300'
                }
                icon={<BiStrikethrough size={25} />}
              />
            </Toggle>
          </Tooltip>

          <Popover placement="bottom" closeOnBlur>
            <PopoverTrigger>
              <Box>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="Ordered list"
                  aria-label="A tooltip for the link"
                >
                  <Toggle asChild pressed={editor.isActive('orderedList')}>
                    <IconButton
                      backgroundColor={
                        !(
                          editor!.isActive({ textAlign: 'right' }) ||
                          editor!.isActive({ textAlign: 'left' }) ||
                          editor!.isActive({ textAlign: 'center' }) ||
                          editor!.isActive({ textAlign: 'justify' })
                        )
                          ? 'transparent'
                          : 'whiteAlpha.300'
                      }
                      aria-label="Toggle Align Popover"
                      icon={renderAlignIcon()}
                    />
                  </Toggle>
                </Tooltip>
              </Box>
            </PopoverTrigger>
            <PopoverContent zIndex={99} width="fit-content">
              <PopoverArrow />
              <PopoverBody>
                <IconButton
                  aria-label="Toggle Align Left"
                  backgroundColor={
                    !editor!.isActive({ textAlign: 'left' })
                      ? 'transparent'
                      : 'whiteAlpha.300'
                  }
                  icon={<BiAlignLeft size={25} />}
                  onClick={() =>
                    editor.chain().focus().setTextAlign('left').run()
                  }
                />
                <IconButton
                  aria-label="Toggle Center"
                  backgroundColor={
                    !editor!.isActive({ textAlign: 'center' })
                      ? 'transparent'
                      : 'whiteAlpha.300'
                  }
                  icon={<BiAlignMiddle size={25} />}
                  onClick={() =>
                    editor.chain().focus().setTextAlign('center').run()
                  }
                />
                <IconButton
                  aria-label="Toggle Align Right"
                  backgroundColor={
                    !editor!.isActive({ textAlign: 'right' })
                      ? 'transparent'
                      : 'whiteAlpha.300'
                  }
                  icon={<BiAlignRight size={25} />}
                  onClick={() =>
                    editor.chain().focus().setTextAlign('right').run()
                  }
                />

                <IconButton
                  aria-label="Toggle Justify"
                  backgroundColor={
                    !editor!.isActive({ textAlign: 'justify' })
                      ? 'transparent'
                      : 'whiteAlpha.300'
                  }
                  icon={<BiAlignJustify size={25} />}
                  onClick={() =>
                    editor.chain().focus().setTextAlign('justify').run()
                  }
                />
              </PopoverBody>
            </PopoverContent>
          </Popover>
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
                  !editor.isActive('orderedList')
                    ? 'transparent'
                    : 'whiteAlpha.300'
                }
                icon={<BiListOl size={25} />}
              />
            </Toggle>
          </Tooltip>
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
                  !editor.isActive('bulletList')
                    ? 'transparent'
                    : 'whiteAlpha.300'
                }
                icon={<BiListUl size={25} />}
              />
            </Toggle>
          </Tooltip>

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
                aria-label="Toggle Link"
                backgroundColor={
                  !editor.isActive('link') ? 'transparent' : 'whiteAlpha.300'
                }
                icon={<BiLink size={25} />}
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Clear applied formatting to current selected text"
            aria-label="A tooltip for the format clear"
          >
            <Toggle
              asChild
              onPressedChange={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }
            >
              <IconButton
                aria-label="Clear Formatting"
                backgroundColor="transparent"
                icon={<FaRemoveFormat size={25} />}
              />
            </Toggle>
          </Tooltip>
        </HStack>
      </Box>
      <BubbleMenu
        editor={editor as Editor}
        tippyOptions={{
          duration: 100,
          theme: 'material',
          placement: 'bottom-start',
          popperOptions: {
            placement: 'bottom-start',
          },
        }}
        shouldShow={editor => editor.editor.isActive('link')}
        className="floating-menu"
      >
        <Flex
          backgroundColor="whiteAlpha.300"
          border="1px solid #7b8794"
          paddingX={4}
          paddingY={2}
          gap={10}
          width="max-content"
          borderRadius="6px"
        >
          <Link href={editor.getAttributes('link').href ?? ''} target="_blank">
            <Box
              color="inhereit"
              maxWidth="300px"
              width="fit-content"
              minWidth="100px"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              overflow="hidden"
              fontWeight="500"
            >
              Link:{' '}
              <Text display="inline" color="#F35826">
                {editor.getAttributes('link').href}
              </Text>
            </Box>
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
