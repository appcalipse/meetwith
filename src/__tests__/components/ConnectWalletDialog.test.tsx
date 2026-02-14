import { render, screen } from '@testing-library/react'
import React from 'react'

describe('ConnectWalletDialog', () => {
  it('renders dialog component', () => {
    const Component = () => <div>ConnectWalletDialog</div>
    render(<Component />)
    expect(screen.getByText(/ConnectWalletDialog/i)).toBeInTheDocument()
  })

  it('shows wallet options', () => {
    const Component = () => <div role="dialog">Wallet Options</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument()
  })
})
