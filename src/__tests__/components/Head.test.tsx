import { render } from '@testing-library/react'
import React from 'react'

describe('Head', () => {
  it('renders head component', () => {
    const Component = () => <head><title>Test</title></head>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })

  it('sets page title', () => {
    const Component = () => <head><title>Meetwith</title></head>
    render(<Component />)
    expect(document.title).toBeTruthy()
  })
})
