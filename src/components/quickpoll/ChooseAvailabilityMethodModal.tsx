import {
  Box,
  Heading,
  HStack,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

const CalendarEditIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M8 2V5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 2V5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 9.08984H20.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.211 15.7683L15.671 19.3083C15.531 19.4483 15.401 19.7083 15.371 19.8983L15.181 21.2483C15.111 21.7383 15.451 22.0783 15.941 22.0083L17.291 21.8183C17.481 21.7883 17.751 21.6583 17.881 21.5183L21.421 17.9783C22.031 17.3683 22.321 16.6583 21.421 15.7583C20.531 14.8683 19.821 15.1583 19.211 15.7683Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.6992 16.2773C18.9992 17.3573 19.8392 18.1973 20.9192 18.4973"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5V12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9945 13.6992H12.0035"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.29529 13.6992H8.30427"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.29529 16.6992H8.30427"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
)

const CalendarAddIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M8 2V5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 2V5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 9.08984H20.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 23C20.2091 23 22 21.2091 22 19C22 16.7909 20.2091 15 18 15C15.7909 15 14 16.7909 14 19C14 21.2091 15.7909 23 18 23Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4917 19.0508H16.5117"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 17.5898V20.5798"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 8.5V16.36C20.27 15.53 19.2 15 18 15C15.79 15 14 16.79 14 19C14 19.75 14.21 20.46 14.58 21.06C14.79 21.42 15.06 21.74 15.37 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9945 13.6992H12.0035"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.29529 13.6992H8.30427"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.29529 16.6992H8.30427"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
)

interface ChooseAvailabilityMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectManual: () => void
  onSelectImport: () => void
  children: React.ReactNode // The trigger element
}

const ChooseAvailabilityMethodModal: React.FC<
  ChooseAvailabilityMethodModalProps
> = ({ isOpen, onClose, onSelectManual, onSelectImport, children }) => {
  // Use semantic tokens for colors
  const bgColor = 'bg-surface'
  const borderColor = 'border-default'
  const iconColor = 'text-subtle'
  const textColor = 'text-primary'

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-start"
      closeOnBlur={true}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        bg={bgColor}
        borderColor={borderColor}
        borderRadius="12px"
        width={{ base: '300px', md: '459px' }}
        height={{ base: 'auto', md: '230px' }}
        boxShadow="lg"
        _focus={{ outline: 'none' }}
      >
        <PopoverBody
          p={6}
          height="100%"
          display="flex"
          flexDirection="column"
          justifyContent="center"
        >
          <VStack align="flex-start" spacing={6} width="100%">
            <Heading
              fontSize={{ base: '18px', md: '22px' }}
              fontWeight="700"
              color={textColor}
            >
              Choose how to add your availability
            </Heading>
            <HStack spacing={6} width="100%" alignItems="flex-start">
              {/* Manual Input Option */}
              <VStack
                onClick={onSelectManual}
                cursor="pointer"
                align="center"
                spacing={3}
                width="140px"
                role="group"
              >
                <Box
                  width="74px"
                  height="74px"
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="10px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  _groupHover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  }}
                >
                  <CalendarEditIcon w="44px" h="44px" color={iconColor} />
                </Box>
                <Text
                  fontSize="12.8px"
                  fontWeight="500"
                  color={textColor}
                  textAlign="center"
                  lineHeight="1.2"
                >
                  Input manually
                </Text>
              </VStack>

              {/* Import Option */}
              <VStack
                onClick={onSelectImport}
                cursor="pointer"
                align="center"
                spacing={3}
                width="140px"
                role="group"
              >
                <Box
                  width="74px"
                  height="74px"
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="10px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  _groupHover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  }}
                >
                  <CalendarAddIcon w="44px" h="44px" color={iconColor} />
                </Box>
                <VStack spacing={0}>
                  <Text
                    fontSize="12.8px"
                    fontWeight="500"
                    color={textColor}
                    textAlign="center"
                    lineHeight="1.2"
                  >
                    Import from Calendar
                  </Text>
                  <Text
                    fontSize="10.2px"
                    fontWeight="400"
                    color={textColor}
                    textAlign="center"
                    opacity={0.8}
                  >
                    (Sign in/Sign up)
                  </Text>
                </VStack>
              </VStack>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

export default ChooseAvailabilityMethodModal
