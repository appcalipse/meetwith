import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import React, { useRef, useState } from 'react'
import { FaCheck, FaChevronDown, FaMinusCircle } from 'react-icons/fa'
import { useOnClickOutside } from 'usehooks-ts'

type DomainType = 'ens' | 'lens' | 'ud' | 'mww' | 'custom'

export interface DisplayName {
  label: string
  value: string
  type: DomainType
}

const HandlePicker: React.FC<{
  selected?: DisplayName
  setValue: (option: DisplayName) => void
  options: DisplayName[]
}> = ({ selected, setValue, options }) => {
  // refs
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)

  useOnClickOutside(dropdownRef, () => {
    setIsDropdownOpen(false)
  })

  const onOptionClick = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: DisplayName,
    isDisabled: boolean
  ) => {
    if (isDisabled) {
      return e.stopPropagation()
    }

    if (option.type === 'custom' && inputRef.current) {
      // ;(inputRef.current as HTMLInputElement).focus()
    }

    return setValue(
      option.type !== 'custom' ? option : { ...option, label: '' }
    )
  }

  const textChange = (text: string) => {
    const option = options.find(({ value }) => text === value)
    if (option) {
      setValue(option)
    } else {
      setValue({
        label: text,
        value: '',
        type: 'custom',
      })
    }
  }

  const bgColor = useColorModeValue('gray.200', 'gray.800')
  const bgColorHover = useColorModeValue('gray.100', 'gray.900')
  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const noENS = !options.some(option => option.type === 'ens')
  const noLens = !options.some(option => option.type === 'lens')
  const noUD = !options.some(option => option.type === 'ud')

  const _options = [
    { label: 'Custom display name', value: '', type: 'custom' as DomainType },
    ...options,
  ]

  if (noENS) {
    _options.push({
      label: 'No name found on ENS',
      value: '',
      type: 'ens' as DomainType,
    })
  }

  if (noLens) {
    _options.push({
      label: 'No name found on Lens Protocol',
      value: '',
      type: 'lens' as DomainType,
    })
  }

  if (noUD) {
    _options.push({
      label: 'No name found on Unstoppable Domains',
      value: '',
      type: 'ud' as DomainType,
    })
  }

  _options.filter(option => option.type === 'mww')

  const filtered: DisplayName[] = []
  for (const element of _options) {
    const isDuplicate = filtered
      .map(filter => filter.label)
      .includes(element.label)

    if (!isDuplicate) {
      filtered.push(element)
    } else if (element.type === 'mww') {
      filtered.filter(filter => filter.label === element.label)
      filtered.push(element)
    }
  }

  return (
    <Flex
      role="presentation"
      ref={dropdownRef}
      position="relative"
      width="100%"
      onClick={() => setIsDropdownOpen(prev => !prev)}
    >
      <InputGroup>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Write down your display name, or pick from the list (if available)"
          value={selected?.label || ''}
          flex={1}
          onChange={e => textChange(e.target.value)}
        />
        <InputRightElement children={<FaChevronDown />} />
      </InputGroup>

      {isDropdownOpen && (
        <Box position="absolute" left={0} top={12} zIndex={100}>
          <ToggleGroupPrimitive.Root
            type="single"
            defaultValue={selected?.value}
            aria-label="Display Name"
          >
            <Box
              borderRadius={8}
              bgColor={bgColor}
              maxH="240px"
              minWidth="240px"
              overflow="auto"
            >
              <VStack overflow="hidden" py={2}>
                {filtered.map(({ value, label, type }, i) => {
                  const isSelected =
                    (selected?.type === 'custom' && type === 'custom') ||
                    (selected?.value === value && value !== '')

                  const disabled = type !== 'custom' && value === ''

                  let extraText = ''
                  if (value !== '') {
                    switch (type) {
                      case 'ens':
                        extraText = ' (from ENS)'
                        break
                      case 'lens':
                        extraText = ' (from Lens Protocol)'
                        break
                      case 'ud':
                        extraText = ' (from Unstoppable Domains)'
                        break
                      case 'mww':
                        extraText = ' (from your PRO plan)'
                        break
                      default:
                    }
                  }

                  return (
                    <ToggleGroupPrimitive.Item
                      style={{ width: '100%' }}
                      key={i}
                      value={label}
                      aria-label={label}
                      onClick={e =>
                        onOptionClick(e, { value, label, type }, disabled)
                      }
                    >
                      <Flex
                        flex={1}
                        py={2}
                        px={4}
                        alignItems="center"
                        justifyContent="start"
                        cursor={disabled ? 'default' : 'pointer'}
                        borderBottom="1px solid"
                        borderColor={borderColor}
                        borderBottomWidth={1}
                        _hover={{ bgColor: bgColorHover }}
                      >
                        <Text
                          textAlign="start"
                          flex={1}
                          opacity={disabled ? '0.6' : '1'}
                        >
                          {label}
                          {extraText}
                        </Text>
                        {isSelected && (
                          <Box mx={2}>
                            <FaCheck />
                          </Box>
                        )}
                        {disabled && (
                          <Box mx={2}>
                            <FaMinusCircle />
                          </Box>
                        )}
                      </Flex>
                    </ToggleGroupPrimitive.Item>
                  )
                })}
              </VStack>
            </Box>
          </ToggleGroupPrimitive.Root>
        </Box>
      )}
    </Flex>
  )
}

export default HandlePicker
