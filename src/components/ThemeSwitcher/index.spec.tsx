import { act, fireEvent, render, screen } from '@testing-library/react'

import { ChakraTestWrapper } from '../../testing/chakra-helpers'
import { ThemeSwitcher } from '.'

describe('ThemeSwitcher', () => {
  it('should react to theme mode switch', () => {
    // given
    const rawComponent = <ThemeSwitcher />

    // when
    render(rawComponent, { wrapper: ChakraTestWrapper })

    // then
    expect(screen.getByTestId('light-mode')).toBeInTheDocument()

    // when
    fireEvent.click(screen.getByTestId('change-theme'))

    // then
    expect(screen.getByTestId('dark-mode')).toBeInTheDocument()
  })
})
