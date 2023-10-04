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

export enum ProfileInfoProvider {
  ENS = 'ens',
  LENS = 'lens',
  UNSTOPPABLE_DOAMINS = 'ud',
  MWW = 'mww',
  FREENAME = 'freename',
  CUSTOM = 'custom',
}

export interface DisplayName {
  label: string
  value: string
  type: ProfileInfoProvider
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

    if (
      (option.type === ProfileInfoProvider.CUSTOM ||
        option.type === ProfileInfoProvider.MWW) &&
      inputRef.current
    ) {
      ;(inputRef.current as HTMLInputElement).focus()
    }

    return setValue(option)
  }

  const textChange = (text: string, type: any) => {
    const option = options.find(({ value }) => text === value)

    if (option) {
      setValue(option)
    } else {
      setValue({
        label: text,
        value: text,
        type: type,
      })
    }
  }

  const bgColor = useColorModeValue('gray.200', 'gray.800')
  const bgColorHover = useColorModeValue('gray.100', 'gray.900')
  const borderColor = useColorModeValue('gray.300', 'gray.700')

  const noENS = !options.some(option => option.type === ProfileInfoProvider.ENS)
  const noLens = !options.some(
    option => option.type === ProfileInfoProvider.LENS
  )
  const noUD = !options.some(
    option => option.type === ProfileInfoProvider.UNSTOPPABLE_DOAMINS
  )
  const noFreename = !options.some(
    option => option.type === ProfileInfoProvider.FREENAME
  )
  const noMWW = !options.some(option => option.type === ProfileInfoProvider.MWW)
  const noCustom = !options.some(
    option => option.type === ProfileInfoProvider.CUSTOM
  )

  const _options = noCustom
    ? [
        {
          label: 'Custom display name',
          value: '',
          type: ProfileInfoProvider.CUSTOM,
        },
        ...options,
      ]
    : options

  if (noENS) {
    _options.push({
      label: 'No name found on ENS',
      value: '',
      type: ProfileInfoProvider.ENS,
    })
  }

  if (noLens) {
    _options.push({
      label: 'No name found on Lens Protocol',
      value: '',
      type: ProfileInfoProvider.LENS,
    })
  }

  if (noUD) {
    _options.push({
      label: 'No name found on Unstoppable Domains',
      value: '',
      type: ProfileInfoProvider.UNSTOPPABLE_DOAMINS,
    })
  }

  if (noFreename) {
    _options.push({
      label: 'No name found on Freename',
      value: '',
      type: ProfileInfoProvider.FREENAME,
    })
  }

  if (noMWW) {
    _options.push({
      label: 'No MWW Domain (PRO plan)',
      value: '',
      type: ProfileInfoProvider.MWW,
    })
  }

  let filtered: (DisplayName & { isSelected: boolean })[] = []
  for (const element of _options) {
    const isDuplicate = filtered
      .map(filter => filter.label)
      .includes(element.label)

    const isSelected =
      (selected?.type === ProfileInfoProvider.MWW &&
        element.type === ProfileInfoProvider.MWW) ||
      (selected?.type === ProfileInfoProvider.CUSTOM &&
        element.type === ProfileInfoProvider.CUSTOM) ||
      (selected?.value === element.value && element.value !== '')

    if (
      !isDuplicate ||
      (element.type === ProfileInfoProvider.MWW &&
        filtered.some(filter => filter.type !== ProfileInfoProvider.MWW)) ||
      (element.type === ProfileInfoProvider.CUSTOM &&
        filtered.some(filter => filter.type !== ProfileInfoProvider.CUSTOM))
    ) {
      filtered.push({ ...element, isSelected })
    } else {
      filtered = filtered.filter(filter => filter.label !== element.label)
      filtered.push({ ...element, isSelected })
    }
  }

  if (filtered.filter(option => option.isSelected).length > 1) {
    for (const element of filtered) {
      if (element.isSelected && selected?.type != element.type) {
        element.isSelected = false
      }
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
          placeholder="Write down your display name, or pick one from the list (if available)"
          value={selected?.value || selected?.label || ''}
          flex={1}
          onChange={e => textChange(e.target.value, selected?.type)}
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
              <VStack overflow="hidden">
                {filtered.map(({ value, label, type, isSelected }, i) => {
                  const disabled =
                    type !== ProfileInfoProvider.CUSTOM &&
                    type !== ProfileInfoProvider.MWW &&
                    value == ''

                  let extraText = ''
                  if (value !== '') {
                    switch (type) {
                      case ProfileInfoProvider.CUSTOM:
                        extraText = ' (Saved Custom Name)'
                        break
                      case ProfileInfoProvider.ENS:
                        extraText = ' (from ENS)'
                        break
                      case ProfileInfoProvider.LENS:
                        extraText = ' (from Lens Protocol)'
                        break
                      case ProfileInfoProvider.UNSTOPPABLE_DOAMINS:
                        extraText = ' (from Unstoppable Domains)'
                      case ProfileInfoProvider.FREENAME:
                        extraText = ' (from Freename)'
                        break
                      case ProfileInfoProvider.MWW:
                        extraText = ' (from your PRO plan)'
                        break
                      default:
                    }
                  }

                  return (
                    <ToggleGroupPrimitive.Item
                      style={{ width: '100%' }}
                      key={i}
                      asChild
                      value={label}
                      aria-label={label}
                      onClick={e =>
                        onOptionClick(e, { value, label, type }, disabled)
                      }
                    >
                      <Flex
                        mt={'0 !important'}
                        flex={1}
                        p={4}
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
