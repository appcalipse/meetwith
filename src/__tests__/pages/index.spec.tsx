import { render, screen } from '@testing-library/react'

import Home from '@/pages/index'
import { ChakraTestWrapper } from '@/testing/chakra-helpers'

describe('ThemeSwitcher', () => {
  it('should react to theme mode switch', () => {
    // given
    const rawComponent = <Home />

    // when
    render(rawComponent, { wrapper: ChakraTestWrapper })

    // then
    expect(screen.getByTestId('main-container')).toBeInTheDocument()
  })
})
