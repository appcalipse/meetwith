import { Button } from '@chakra-ui/button'
import { useColorMode, useColorModeValue } from '@chakra-ui/color-mode'
import { Stack } from '@chakra-ui/layout'
import { Switch } from '@chakra-ui/switch'
import React, { useEffect } from 'react'
import { BsMoon, BsSun } from 'react-icons/bs'

import { logEvent } from '../../utils/analytics'

export const ThemeSwitcher: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  useEffect(() => {
    logEvent('Toggled theme', { mode: colorMode })
  }, [colorMode])

  return (
    <>
      <Stack
        display={{ base: 'none', md: 'flex' }}
        justifyContent="center"
        alignItems="center"
        direction="row"
      >
        <BsSun />
        <Switch
          pt={1}
          colorScheme="orange"
          size="md"
          onChange={toggleColorMode}
          defaultChecked={colorMode === 'light' ? false : true}
          isChecked={colorMode === 'light' ? false : true}
        />
        <BsMoon />
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
          {colorMode === 'light' ? <BsMoon /> : <BsSun />}
        </Button>
      </Stack>
    </>
  )
}
