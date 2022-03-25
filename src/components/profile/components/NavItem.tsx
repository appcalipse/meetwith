import {
  Box,
  Flex,
  FlexProps,
  Icon,
  Slide,
  SlideFade,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import React, { useEffect } from 'react'
import { IconType } from 'react-icons'
import { FaLock } from 'react-icons/fa'

import { EditMode } from '../../../types/Dashboard'

interface NavItemProps extends FlexProps {
  selected: boolean
  icon: IconType
  text: string
  mode: EditMode
  locked: boolean
  changeMode: (mode: EditMode) => void
}
export const NavItem = ({
  selected,
  icon,
  text,
  mode,
  changeMode,
  locked,
  ...rest
}: NavItemProps) => {
  const unlockedColor = useColorModeValue('gray.link', 'gray.200')
  const textColor = selected ? 'orange.link' : unlockedColor
  const unlockedIconColor = selected ? 'gray.50' : unlockedColor
  const hoverColor = useColorModeValue('gray.200', 'gray.600')
  const lockedColor = useColorModeValue('gray.400', 'gray.100')
  const iconColor = locked ? lockedColor : unlockedIconColor

  return (
    <Box
      width="100%"
      onClick={() => {
        !locked && changeMode(mode)
      }}
    >
      <Flex
        position="relative"
        align="center"
        width="100%"
        paddingY="3"
        paddingX="6"
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
                top={0}
                height="100%"
                width={16}
                borderRightRadius={999}
                bgGradient="linear(to-r, orange.400, orange.500)"
              />
            </Slide>
            <Icon
              as={icon}
              width={6}
              mr="14"
              fontSize="16"
              transition="color 0.3s"
              color={iconColor}
              zIndex={Number(selected)}
            />
          </>
        )}
        <Text flex={1} color={textColor}>
          {text}
        </Text>
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
      </Flex>
    </Box>
  )
}
