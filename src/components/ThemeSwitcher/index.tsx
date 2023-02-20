import { Button } from '@chakra-ui/button'
import { useColorMode, useColorModeValue } from '@chakra-ui/color-mode'
import { Stack } from '@chakra-ui/layout'
import { Switch } from '@chakra-ui/switch'
import React from 'react'
import { BsMoon, BsSun } from 'react-icons/bs'

import { logEvent } from '../../utils/analytics'

export const ThemeSwitcher: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  const doToggle = () => {
    toggleColorMode()
    logEvent('Toggled theme', { mode: colorMode })
  }

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
          data-testid="change-theme"
          pt={1}
          colorScheme="orangeButton"
          size="md"
          onChange={doToggle}
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
          onClick={doToggle}
          color={useColorModeValue('grey.500', 'grey.400')}
        >
          {colorMode === 'light' ? (
            <BsMoon data-testid="dark-mode" />
          ) : (
            <BsSun data-testid="light-mode" />
          )}
        </Button>
      </Stack>
    </>
  )
}
