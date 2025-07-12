import {
  Box,
  Flex,
  FlexProps,
  HStack,
  Icon,
  Slide,
  Text,
  useColorModeValue,
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
  badge?: number
}

export const NavItem = ({
  selected,
  icon,
  text,
  mode,
  changeMode,
  locked,
  badge,
  ...rest
}: NavItemProps) => {
  const unlockedColor = useColorModeValue('gray.700', 'gray.200')
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
                right={8}
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
              fontSize="16"
              transition="color 0.3s"
              color={iconColor}
              zIndex={10}
            />
          </>
        )}
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
      </Flex>
    </Box>
  )
}
