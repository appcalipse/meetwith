import { Icon } from '@chakra-ui/react'
import {
  chakraComponents,
  ChakraStylesConfig,
  GroupBase,
  Props,
} from 'chakra-react-select'
import { FaChevronDown } from 'react-icons/fa'
export const customSelectComponents: Props['components'] = {
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
}

export const noClearCustomSelectComponent: Props['components'] = {
  ClearIndicator: () => null,
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} w={4} h={4} />
    </chakraComponents.DropdownIndicator>
  ),
}

export type Option<T> = {
  value: T // The actual value of the option
  label: string // The displayed label of the option
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
    w: '100%',
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
