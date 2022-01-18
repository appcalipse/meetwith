import { Input, Wrap, WrapItem, InputProps } from '@chakra-ui/react'
import {
  ChangeEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
  useCallback,
  useState,
} from 'react'
import { BadgeChip } from './chip'

const DEFAULT_STOP_KEYS = ['Tab', 'Space', 'Enter', 'Escape', 'Comma']

export interface ChipInputProps {
  onChange?: (data: string[]) => void
  isReadOnly?: boolean
  initialItems?: string[]
  renderItem?: (item: string) => string
  placeholder?: string
  // chakra props that we want to propagate
  size?: InputProps['size']
}

export const ChipInput: React.FC<ChipInputProps> = ({
  onChange,
  isReadOnly = false,
  initialItems = [],
  renderItem = item => item,
  size = 'md',
  placeholder = 'Type do add items',
}) => {
  const [labels, setLabels] = useState(initialItems)
  const [current, setCurrent] = useState('')

  const addItem = (item: string) => {
    // do nothing with an empty entry
    if (!current?.trim()) {
      return
    }

    const newState = [...labels, item.trim()]
    setLabels(newState)
    setCurrent('')
    if (onChange) {
      onChange(newState)
    }
  }

  const removeItem = (idx: number) => {
    const copy = [...labels]
    copy.splice(idx, 1)
    setLabels(copy)
    if (onChange) {
      onChange(copy)
    }
  }

  const onRemoveItem = (idx: number) => {
    removeItem(idx)
  }

  const badges = labels.map((it, idx) => {
    return (
      <WrapItem key={`${idx}-${it}`}>
        <BadgeChip onRemove={() => onRemoveItem(idx)} allowRemove={!isReadOnly}>
          {renderItem(it)}
        </BadgeChip>
      </WrapItem>
    )
  })

  const onTextChange: ChangeEventHandler<HTMLInputElement> = event =>
    setCurrent(event.target.value)

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = ev => {
    // handle item creation
    if (DEFAULT_STOP_KEYS.includes(ev.code)) {
      ev.preventDefault()
      addItem(current)
    }
    // and support backspace as a natural way to remove the last item in the input
    else if (ev.code === 'Backspace' && labels.length) {
      removeItem(labels.length - 1)
    }
  }

  const onLostFocus: FocusEventHandler<HTMLInputElement> = () => {
    if (current) {
      addItem(current)
    }
  }

  return (
    <Wrap
      sx={{
        borderWidth: '1px',
        borderColor: 'gray.200',
        borderRadius: 'md',
        paddingLeft: '8px',
      }}
      align={'center'}
    >
      {badges}
      <WrapItem sx={{ flexGrow: 1 }}>
        <Input
          size={size}
          style={{
            display: 'inline-block',
            visibility: isReadOnly ? 'hidden' : 'visible',
            lineHeight: '40px',
          }}
          variant={'unstyled'}
          value={current}
          onChange={onTextChange}
          onBlur={onLostFocus}
          placeholder={labels.length ? '' : placeholder}
          onKeyDown={onKeyDown}
        />
      </WrapItem>
    </Wrap>
  )
}
