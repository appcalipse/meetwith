import { Icon } from '@chakra-ui/react'
import { chakraComponents, Props } from 'chakra-react-select'
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

export const MeetingRemindersComponent: Props['components'] = {
  ClearIndicator: () => null,
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} />
    </chakraComponents.DropdownIndicator>
  ),
}

export type Option<T, J = string> = {
  value: T // The actual value of the option
  label: J // The displayed label of the option
}
