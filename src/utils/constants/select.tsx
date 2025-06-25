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

export const noClearCustomSelectComponent: Props['components'] = {
  ClearIndicator: () => null,
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} w={4} h={4} />
    </chakraComponents.DropdownIndicator>
  ),
}
