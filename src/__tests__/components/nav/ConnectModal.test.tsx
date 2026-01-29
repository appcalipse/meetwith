import { render, screen } from '@testing-library/react'
import React from 'react'

import ConnectModal from '@/components/nav/ConnectModal'

describe('ConnectModal', () => {
  it('renders when open', () => {
    render(<ConnectModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.queryByText(/connect/i)).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<ConnectModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByText(/connect/i)).toBeFalsy()
  })

  it('has close functionality', () => {
    const onClose = jest.fn()
    render(<ConnectModal isOpen={true} onClose={onClose} />)
    const closeBtn = screen.getAllByRole('button')[0]
    if (closeBtn) {
      closeBtn.click()
      expect(onClose).toHaveBeenCalled()
    }
  })
})
