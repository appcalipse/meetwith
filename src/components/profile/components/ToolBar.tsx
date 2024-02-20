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
  BiBold,
  BiItalic,
  BiLink,
  BiListOl,
  BiListUl,
  BiStrikethrough,
  BiUnderline,
} from 'react-icons/bi'
import {
  FaAlignCenter,
  FaAlignJustify,
  FaAlignLeft,
  FaAlignRight,
  FaRemoveFormat,
} from 'react-icons/fa'

import { isValidUrl } from '../../../utils/validations'
import InfoTooltip from './Tooltip'
const Toggle = TogglePrimitive.Root

interface ToolBarProps {
  editor: Editor | null
}

const ToolBar: React.FC<ToolBarProps> = ({ editor }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isPopOverOpen,
    onOpen: onPopoverOpen,
    onClose: onPopOverClose,
  } = useDisclosure()
  const [url, setUrl] = React.useState('')
  const renderAlignButton = React.useCallback(() => {
    switch (true) {
      case editor!.isActive({ textAlign: 'right' }):
        return (
          <Tooltip
            hasArrow
            placement="top"
            label="Align RIght"
            aria-label="A tooltip for the link"
          >
            <Toggle asChild>
              <IconButton
                aria-label="Toggle Align Popover"
                icon={<FaAlignRight size={18} />}
                backgroundColor={
                  !isPopOverOpen ? 'transparent' : 'whiteAlpha.300'
                }
              />
            </Toggle>
          </Tooltip>
        )
      case editor!.isActive({ textAlign: 'left' }):
        return (
          <Tooltip
            hasArrow
            placement="top"
            label="Align Left"
            aria-label="A tooltip for the link"
          >
            <Toggle asChild>
              <IconButton
                aria-label="Toggle Align Popover"
                icon={<FaAlignLeft size={18} />}
                backgroundColor={
                  !isPopOverOpen ? 'transparent' : 'whiteAlpha.300'
                }
              />
            </Toggle>
          </Tooltip>
        )
      case editor!.isActive({ textAlign: 'center' }):
        return (
          <Tooltip
            hasArrow
            placement="top"
            label="Align Center"
            aria-label="A tooltip for the link"
          >
            <Toggle asChild>
              <IconButton
                aria-label="Toggle Align Popover"
                icon={<FaAlignCenter size={18} />}
                backgroundColor={
                  !isPopOverOpen ? 'transparent' : 'whiteAlpha.300'
                }
              />
            </Toggle>
          </Tooltip>
        )
      default:
        return (
          <Tooltip
            hasArrow
            placement="top"
            label="Justify"
            aria-label="A tooltip for the link"
          >
            <Toggle asChild>
              <IconButton
                aria-label="Toggle Align Popover"
                icon={<FaAlignJustify size={18} />}
                backgroundColor={
                  !isPopOverOpen ? 'transparent' : 'whiteAlpha.300'
                }
              />
            </Toggle>
          </Tooltip>
        )
    }
  }, [editor, isPopOverOpen])
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
                  backgroundColor: '#7B8B9A',
                  color: '#CBD2D9',
                  cursor: 'not-allowed',
                  _hover: {
                    backgroundColor: '#7B8B9A',
                    color: '#CBD2D9',
                  },
                }}
                onClick={handleUrlSave}
                colorScheme="primary"
                padding="8px 36px"
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
                backgroundColor={
                  !editor.isActive('bold') ? 'transparent' : 'whiteAlpha.300'
                }
                aria-label="Toggle Bold"
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

          <Popover
            placement="bottom"
            closeOnBlur
            isOpen={isPopOverOpen}
            onOpen={onPopoverOpen}
            onClose={onPopOverClose}
          >
            <PopoverTrigger>
              <button>{renderAlignButton()}</button>
            </PopoverTrigger>
            <PopoverContent width="fit-content">
              <PopoverArrow />
              <PopoverBody>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="Align Left"
                  aria-label="A tooltip for the link"
                >
                  <IconButton
                    aria-label="Toggle Align Left"
                    backgroundColor={
                      !editor!.isActive({ textAlign: 'left' })
                        ? 'transparent'
                        : 'whiteAlpha.300'
                    }
                    icon={<FaAlignLeft size={18} />}
                    onClick={() =>
                      editor.chain().focus().setTextAlign('left').run()
                    }
                  />
                </Tooltip>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="Align Center"
                  aria-label="A tooltip for the link"
                >
                  <IconButton
                    aria-label="Toggle List"
                    backgroundColor={
                      !editor!.isActive({ textAlign: 'center' })
                        ? 'transparent'
                        : 'whiteAlpha.300'
                    }
                    icon={<FaAlignCenter size={18} />}
                    onClick={() =>
                      editor.chain().focus().setTextAlign('center').run()
                    }
                  />
                </Tooltip>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="Align RIght"
                  aria-label="A tooltip for the link"
                >
                  <IconButton
                    aria-label="Toggle Align Right"
                    backgroundColor={
                      !editor!.isActive({ textAlign: 'right' })
                        ? 'transparent'
                        : 'whiteAlpha.300'
                    }
                    icon={<FaAlignRight size={18} />}
                    onClick={() =>
                      editor.chain().focus().setTextAlign('right').run()
                    }
                  />
                </Tooltip>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="Align Center"
                  aria-label="A tooltip for the link"
                >
                  <IconButton
                    aria-label="Toggle List"
                    backgroundColor={
                      !editor!.isActive({ textAlign: 'justify' })
                        ? 'transparent'
                        : 'whiteAlpha.300'
                    }
                    icon={<FaAlignJustify size={18} />}
                    onClick={() =>
                      editor.chain().focus().setTextAlign('justify').run()
                    }
                  />
                </Tooltip>
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
            label="Bulleted list"
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
                backgroundColor={
                  !editor.isActive('link') ? 'transparent' : 'whiteAlpha.300'
                }
                aria-label="Toggle Link"
                icon={<BiLink size={25} />}
              />
            </Toggle>
          </Tooltip>
          <Tooltip
            hasArrow
            placement="top"
            label="Remove Formatting"
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
            <Text
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
            </Text>
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
