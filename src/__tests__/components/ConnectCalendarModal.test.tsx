import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import ConnectCalendarModal from '../../components/ConnectedCalendars/ConnectCalendarModal'

describe('ConnectCalendarModal', () => {
  const mockOnClose = jest.fn()

  it('renders correctly when open', () => {
    render(<ConnectCalendarModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Choose calendar type')).toBeInTheDocument()
  })

  it('calls the correct function when Google button is clicked', async () => {
    render(<ConnectCalendarModal isOpen={true} onClose={mockOnClose} />)
    const googleButton = screen.getByText('Google')
    fireEvent.click(googleButton)
    expect(googleButton).toHaveAttribute('aria-busy', 'true')
  })

  it('calls the correct function when Office 365 button is clicked', async () => {
    render(<ConnectCalendarModal isOpen={true} onClose={mockOnClose} />)
    const officeButton = screen.getByText('Office 365')
    fireEvent.click(officeButton)
    expect(officeButton).toHaveAttribute('aria-busy', 'true')
  })

  it('displays WebDavDetailsPanel when iCloud is selected', () => {
    render(<ConnectCalendarModal isOpen={true} onClose={mockOnClose} />)
    const iCloudButton = screen.getByText('iCloud')
    fireEvent.click(iCloudButton)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('displays WebDavDetailsPanel when Webdav is selected', () => {
    render(<ConnectCalendarModal isOpen={true} onClose={mockOnClose} />)
    const webdavButton = screen.getByText('Webdav')
    fireEvent.click(webdavButton)
    expect(screen.getByText('URL')).toBeInTheDocument()
  })
})
