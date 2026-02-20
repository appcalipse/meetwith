import {
  Badge,
  Box,
  Collapse,
  Flex,
  FlexProps,
  HStack,
  Icon,
  Slide,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { IconType } from 'react-icons'
import { FaLock } from 'react-icons/fa'
import { IoChevronDownOutline } from 'react-icons/io5'

import { EditMode } from '../../../types/Dashboard'

interface NavItemProps extends FlexProps {
  selected: boolean
  icon: IconType
  text: string
  mode: EditMode
  locked: boolean
  changeMode: (mode: EditMode) => void
  badge?: number
  isBeta?: boolean
  isOpened?: boolean
}

interface NavDropdownItemProps extends FlexProps {
  icon: IconType
  text: string
  subItems: Array<{
    text: string
    icon: IconType
    mode: EditMode
  }>
  changeMode: (mode: EditMode) => void
  currentSection?: EditMode
  isOpened?: boolean
}

export const NavDropdownItem = ({
  icon,
  text,
  subItems,
  changeMode,
  currentSection,
  isOpened = true,
  ...rest
}: NavDropdownItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const unlockedColor = useColorModeValue('gray.700', 'gray.200')
  const unlockedIconColor = 'gray.50'
  const hoverColor = useColorModeValue('gray.200', 'gray.600')
  const iconColor = unlockedColor

  const isAnySubItemSelected = subItems.some(
    subItem => currentSection === subItem.mode
  )

  useEffect(() => {
    if (isAnySubItemSelected && !isOpen) {
      setIsOpen(true)
    }
  }, [currentSection, isAnySubItemSelected])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const trigger = (
    <Flex
      position="relative"
      align="center"
      alignItems="center"
      width="100%"
      paddingY="3"
      paddingX="8"
      borderRadius="lg"
      role="group"
      cursor="pointer"
      _hover={{
        color: hoverColor,
      }}
      onClick={handleToggle}
      {...rest}
    >
      <Icon
        as={icon}
        width={6}
        mr="8"
        fontSize={isOpened ? '16' : '24'}
        transition="color 0.3s"
        color={iconColor}
        zIndex={10}
      />
      {isOpened && (
        <HStack alignItems="center" flex={1}>
          <Text position="relative" flex={1} color={iconColor}>
            {text}
          </Text>
          <Icon
            as={IoChevronDownOutline}
            fontSize="26"
            color={iconColor}
            transition="transform 0.2s"
            transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          />
        </HStack>
      )}
    </Flex>
  )

  return (
    <Box width="100%">
      {isOpened ? (
        trigger
      ) : (
        <Tooltip label={text} placement="right">
          {trigger}
        </Tooltip>
      )}

      <Collapse in={isOpen} animateOpacity>
        <VStack spacing={0} pl={8}>
          {subItems.map(subItem => (
            <Box
              key={subItem.text}
              width="100%"
              onClick={() => changeMode(subItem.mode)}
            >
              <Flex
                position="relative"
                align="center"
                alignItems="center"
                width="100%"
                paddingY="3"
                paddingX="8"
                borderRadius="lg"
                role="group"
                cursor="pointer"
                _hover={{
                  color: hoverColor,
                }}
              >
                <Box
                  position={'absolute'}
                  left={-8}
                  top={0}
                  bottom={0}
                  width={24}
                  borderRightRadius={999}
                  backgroundColor="transparent"
                  _groupHover={{
                    backgroundColor: hoverColor,
                  }}
                />
                <Slide
                  direction="left"
                  in={currentSection === subItem.mode}
                  style={{ position: 'absolute' }}
                >
                  <Box
                    position={'absolute'}
                    left={-8}
                    right={8}
                    top={0}
                    height="100%"
                    borderRightRadius={999}
                    bgGradient="linear(to-r, primary.400, primary.500)"
                  />
                </Slide>
                <Icon
                  as={subItem.icon}
                  width={6}
                  mr="8"
                  fontSize={isOpened ? '16' : '24'}
                  transition="color 0.3s"
                  color={
                    currentSection === subItem.mode
                      ? unlockedIconColor
                      : iconColor
                  }
                  zIndex={10}
                />
                {isOpened && (
                  <Text
                    position="relative"
                    flex={1}
                    color={
                      currentSection === subItem.mode
                        ? unlockedIconColor
                        : iconColor
                    }
                  >
                    {subItem.text}
                  </Text>
                )}
              </Flex>
            </Box>
          ))}
        </VStack>
      </Collapse>
    </Box>
  )
}

export const NavItem = ({
  selected,
  icon,
  text,
  mode,
  changeMode,
  locked,
  badge,
  isBeta,
  isOpened = true,
  ...rest
}: NavItemProps) => {
  const unlockedColor = useColorModeValue('gray.700', 'gray.200')
  const unlockedIconColor = selected ? 'gray.50' : unlockedColor
  const hoverColor = useColorModeValue('gray.200', 'gray.600')
  const lockedColor = useColorModeValue('gray.400', 'gray.100')
  const iconColor = locked ? lockedColor : unlockedIconColor

  const content = (
    <Flex
      position="relative"
      align="center"
      alignItems="center"
      width="100%"
      paddingY="3"
      paddingX="8"
      borderRadius="lg"
      role="group"
      cursor="pointer"
      _hover={{
        color: hoverColor,
      }}
      {...rest}
    >
      {icon && (
        <>
          <Box
            position={'absolute'}
            left={0}
            top={0}
            bottom={0}
            width={16}
            borderRightRadius={999}
            backgroundColor="transparent"
            _groupHover={{
              backgroundColor: hoverColor,
            }}
          />
          <Slide
            direction="left"
            in={selected}
            style={{ position: 'absolute' }}
          >
            <Box
              position={'absolute'}
              left={0}
              right={isOpened ? 8 : 4}
              top={0}
              height="100%"
              borderRightRadius={999}
              bgGradient="linear(to-r, primary.400, primary.500)"
            />
          </Slide>
          <Icon
            as={icon}
            width={6}
            mr="8"
            fontSize={isOpened ? '16' : '24'}
            transition="color 0.3s"
            color={iconColor}
            zIndex={10}
          />
        </>
      )}
      {isOpened && (
        <>
          <HStack alignItems="center">
            <Text position="relative" flex={1} color={iconColor}>
              {text}
            </Text>
            {badge && (
              <Box
                borderRadius="999"
                backgroundColor="primary.500"
                color="white"
                fontSize="xs"
                display="flex"
                alignItems="center"
                justifyContent={'center'}
                w="16px"
                h="16px"
              >
                {badge}
              </Box>
            )}
            {isBeta && selected && (
              <Badge bg="#00CE5D" position="relative" rounded={'6px'}>
                Beta
              </Badge>
            )}
          </HStack>
          {locked && (
            <Icon
              mr="4"
              fontSize="16"
              color={lockedColor}
              transition="color 0.3s"
              _groupHover={{
                color: lockedColor,
              }}
              as={FaLock}
            />
          )}
        </>
      )}
    </Flex>
  )

  return (
    <Box
      width="100%"
      onClick={() => {
        !locked && changeMode(mode)
      }}
    >
      {isOpened ? (
        content
      ) : (
        <Tooltip label={text} placement="top">
          {content}
        </Tooltip>
      )}
    </Box>
  )
}
