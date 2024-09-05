import {
  Box,
  HStack,
  Input,
  InputProps,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  ChangeEventHandler,
  ClipboardEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
  ReactElement,
  useState,
} from 'react'

import { IGroupParticipant } from '@/pages/dashboard/schedule'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isValidEmail, isValidEVMAddress } from '@/utils/validations'

import { BadgeChip } from './chip'

const DEFAULT_STOP_KEYS = ['Tab', 'Space', 'Enter', 'Escape', 'Comma']

interface ChipInputProps {
  onChange: (data: ParticipantInfo[]) => void
  isReadOnly?: boolean
  currentItems: Array<ParticipantInfo | IGroupParticipant>
  renderItem: (item: ParticipantInfo) => string
  placeholder?: string
  // chakra props that we want to propagate
  size?: InputProps['size']
  button?: ReactElement
  inputProps?: InputProps
}

export const ChipInput: React.FC<ChipInputProps> = ({
  onChange,
  isReadOnly = false,
  currentItems = [],
  renderItem,
  size = 'md',
  placeholder = 'Type do add items',
  button,
  inputProps,
}) => {
  const [current, setCurrent] = useState('')
  const [focused, setFocused] = useState(false)

  const addItem = (items: string[], pasting?: boolean) => {
    // do nothing with an empty entry

    if (!current?.trim() && !pasting) {
      return
    }

    const newState: ParticipantInfo[] = [
      ...(currentItems as ParticipantInfo[]),
      ...items.map(item => {
        const _item = item.trim()
        if (isValidEVMAddress(_item)) {
          return {
            account_address: _item.toLowerCase(),
            status: ParticipationStatus.Pending,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
          }
        } else if (isValidEmail(_item)) {
          return {
            guest_email: _item,
            status: ParticipationStatus.Pending,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
          }
        } else {
          return {
            name: _item,
            status: ParticipationStatus.Pending,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
          }
        }
      }),
    ]
    setCurrent('')
    if (onChange) {
      onChange(newState)
    }
  }

  const removeItem = (idx: number) => {
    const copy = [...currentItems]
    copy.splice(idx, 1)
    onChange(copy as ParticipantInfo[])
  }

  const onRemoveItem = (idx: number) => {
    removeItem(idx)
  }

  const badges = currentItems.map((it, idx) => {
    return (
      <Box key={`${idx}-${it}`}>
        <BadgeChip onRemove={() => onRemoveItem(idx)} allowRemove={!isReadOnly}>
          {renderItem(it as ParticipantInfo)}
        </BadgeChip>
      </Box>
    )
  })

  const onTextChange: ChangeEventHandler<HTMLInputElement> = event =>
    setCurrent(event.target.value)

  const onPaste: ClipboardEventHandler<HTMLInputElement> = event => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text/plain')
    const items = []
    if (pasted) {
      items.push(...pasted.split(','))
    }

    addItem(items, true)
    setCurrent('')
  }

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = ev => {
    // handle item creation
    if (DEFAULT_STOP_KEYS.includes(ev.code)) {
      ev.preventDefault()
      addItem([current])
    }
    // and support backspace as a natural way to remove the last item in the input
    else if (ev.code === 'Backspace' && currentItems.length && !current) {
      removeItem(currentItems.length - 1)
    }
  }

  const onLostFocus: FocusEventHandler<HTMLInputElement> = () => {
    setFocused(false)
    if (current) {
      addItem([current])
    }
  }

  const borderColor = useColorModeValue('gray.300', 'neutral.400')
  const hoverColor = useColorModeValue('#3182ce', '#63b3ed')

  return (
    <HStack
      borderWidth={'1px'}
      transition="border 300ms ease-out"
      borderColor={focused ? hoverColor : borderColor}
      boxShadow={focused ? `0 0 0 1px ${hoverColor}` : 'none'}
      borderRadius={'md'}
      paddingLeft={'8px'}
      minHeight={'40px'}
      alignItems={'center'}
      display={'flex'}
      align={'center'}
      p={2}
      flex={1}
      flexWrap={'wrap'}
      spacing={0}
    >
      {badges}
      <Box flex={1} pos="relative">
        <Input
          size={size}
          display={'inline-block'}
          visibility={isReadOnly ? 'hidden' : 'visible'}
          onPaste={onPaste}
          variant={'unstyled'}
          value={current}
          onFocus={() => setFocused(true)}
          onChange={onTextChange}
          onBlur={onLostFocus}
          placeholder={currentItems.length ? '' : placeholder}
          onKeyDown={onKeyDown}
          _placeholder={{
            color: 'neutral.400',
          }}
          {...inputProps}
        />
        {button}
      </Box>
    </HStack>
  )
}
