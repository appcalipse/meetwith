import { Button } from '@chakra-ui/button'
import { useColorMode, useColorModeValue } from '@chakra-ui/color-mode'
import { Stack } from '@chakra-ui/layout'
import { Switch } from '@chakra-ui/switch'
import React from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'

export const ThemeSwitcher: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <>
      <Stack
        display={{ base: 'none', md: 'flex' }}
        justifyContent="center"
        alignItems="center"
        direction="row"
      >
        <FaSun />
        <Switch
          pt={1}
          colorScheme="orange"
          size="md"
          onChange={toggleColorMode}
          defaultChecked={colorMode === 'light' ? false : true}
          isChecked={colorMode === 'light' ? false : true}
        />
        <FaMoon />
      </Stack>
      <Stack
        display={{ base: 'flex', md: 'none' }}
        justifyContent="center"
        alignItems="center"
        direction="row"
      >
        <Button
          size="lg"
          onClick={toggleColorMode}
          color={useColorModeValue('grey.500', 'grey.400')}
        >
          {colorMode === 'light' ? <FaMoon /> : <FaSun />}
        </Button>
      </Stack>
    </>
  )
}
