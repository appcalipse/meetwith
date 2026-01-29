import { render, screen } from '@testing-library/react'
import React from 'react'

import TimezoneSelector from '@/components/TimezoneSelector'

describe('TimezoneSelector', () => {
  it('renders timezone selector', () => {
    render(<TimezoneSelector value="UTC" onChange={jest.fn()} />)
    expect(screen.getByText(/timezone/i)).toBeInTheDocument()
  })

  it('displays current timezone', () => {
    render(<TimezoneSelector value="America/New_York" onChange={jest.fn()} />)
    expect(screen.getByText(/new york/i)).toBeInTheDocument()
  })

  it('has dropdown select', () => {
    render(<TimezoneSelector value="UTC" onChange={jest.fn()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onChange when timezone selected', () => {
    const onChange = jest.fn()
    render(<TimezoneSelector value="UTC" onChange={onChange} />)
    
    const select = screen.getByRole('combobox')
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalled()
  })

  it('shows popular timezones', () => {
    render(<TimezoneSelector value="UTC" onChange={jest.fn()} />)
    const select = screen.getByRole('combobox')
    select.click()
    expect(screen.getByText(/america|europe|asia/i)).toBeInTheDocument()
  })

  it('allows searching timezones', () => {
    render(<TimezoneSelector value="UTC" onChange={jest.fn()} searchable />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
