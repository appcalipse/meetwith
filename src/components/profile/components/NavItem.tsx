import {
  Box,
  Flex,
  FlexProps,
  Icon,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import React from 'react'
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
              borderRightRadius={9999}
              backgroundColor="transparent"
              {...(selected
                ? {
                    bgGradient: 'linear(to-r, orange.400, orange.500)',
                  }
                : {
                    _groupHover: {
                      backgroundColor: hoverColor,
                    },
                  })}
            />
            <Icon
              as={icon}
              width={6}
              mr="14"
              fontSize="16"
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
