import { Icon } from '@chakra-ui/react'
import {
  chakraComponents,
  ChakraStylesConfig,
  GroupBase,
  Props,
} from 'chakra-react-select'
import { FaChevronDown } from 'react-icons/fa'

export const getCustomSelectComponents = <
  T = unknown,
  IsMulti extends boolean = false
>(): Props<T, IsMulti>['components'] => ({
  ClearIndicator: props => (
    <chakraComponents.ClearIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} w={4} h={4} />
    </chakraComponents.ClearIndicator>
  ),
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} w={4} h={4} />
    </chakraComponents.DropdownIndicator>
  ),
})

export const customSelectComponents = getCustomSelectComponents()

export const noClearCustomSelectComponent: Props['components'] = {
  ClearIndicator: () => null,
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} w={4} h={4} />
    </chakraComponents.DropdownIndicator>
  ),
}
export const rsvpSelectComponent: Props['components'] = {
  ClearIndicator: () => null,
  ValueContainer: props => (
    <chakraComponents.ValueContainer
      {...props}
      className="rsvp-value-container"
    />
  ),
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator
      className="noBg rsvp-dropdown"
      {...props}
    >
      <Icon as={FaChevronDown} w={3} h={3} />
    </chakraComponents.DropdownIndicator>
  ),
}

export type Option<T, J = string> = {
  value: T // The actual value of the option
  label: J // The displayed label of the option
}
export type TimeZoneOption = Option<string> & {
  searchKeys: Array<{ id: string; name: string }>
}
export interface FilterOptionOption<Option> {
  readonly label: string
  readonly value: string
  readonly data: Option
}
export const timeZoneFilter = (
  option: FilterOptionOption<TimeZoneOption>,
  inputValue: string
) => {
  if (!inputValue) return true

  const searchValue = inputValue.toLowerCase()
  const searchTerms = [
    option.label?.toLowerCase(),
    option.label?.toLowerCase().replaceAll('0', ''),
    ...(option.data?.searchKeys?.map((c: { name: string }) =>
      c.name?.toLowerCase()
    ) || []),
    ...(option.data?.searchKeys?.map((c: { id: string }) =>
      c.id?.toLowerCase()
    ) || []),
  ].filter(Boolean)

  return searchTerms.some(term => term?.includes(searchValue))
}
export const fullWidthStyle:
  | ChakraStylesConfig<unknown, boolean, GroupBase<unknown>>
  | undefined = {
  container: provided => ({
    ...provided,
    borderColor: 'inherit',
    borderRadius: 'md',
    maxW: '100%',
    display: 'block',
    width: '100% !important',
    bg: 'select-bg',
  }),
  placeholder: provided => ({
    ...provided,
    textAlign: 'left',
  }),
  input: provided => ({
    ...provided,
    textAlign: 'left',
  }),
  control: provided => ({
    ...provided,
    textAlign: 'left',
  }),
}
