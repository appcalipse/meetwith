import { render, screen } from '@testing-library/react'
import crypto from 'crypto'
import * as react from 'react'

import Home from '@/pages/index'
import { ChakraTestWrapper } from '@/testing/chakra-helpers'
jest.mock('react')
describe('ThemeSwitcher', () => {
  it('should react to theme mode switch', () => {
    // givens
    // mock forwardRef and display name
    jest.spyOn(react, 'forwardRef').mockImplementation((props, ref) => {
      return <div ref={ref}>{props.children}</div>
    })

    const rawComponent = <Home />
    // when
    render(rawComponent, { wrapper: ChakraTestWrapper })

    // then
    expect(screen.getByTestId('main-container')).toBeInTheDocument()
  })
})
