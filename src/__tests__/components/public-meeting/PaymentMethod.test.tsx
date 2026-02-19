import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import PaymentMethod from '@/components/public-meeting/PaymentMethod'
import { PublicScheduleContext } from '@/components/public-meeting/index'
import { PaymentStep, PaymentType } from '@/utils/constants/meeting-types'
import { FaCreditCard } from 'react-icons/fa'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockHandleSelectPaymentMethod = jest.fn()
const mockSetPaymentType = jest.fn()

const renderComponent = (props = {}, contextValue: any = {}) => {
  const defaultProps = {
    id: 'card-payment',
    name: 'Credit Card',
    step: PaymentStep.SELECT_PAYMENT_METHOD,
    icon: FaCreditCard,
    type: PaymentType.CARD,
    ...props
  }

  const defaultContext = {
    handleSelectPaymentMethod: mockHandleSelectPaymentMethod,
    setPaymentType: mockSetPaymentType,
    ...contextValue
  }

  return render(
    <PublicScheduleContext.Provider value={defaultContext}>
      <PaymentMethod {...defaultProps} />
    </PublicScheduleContext.Provider>
  )
}

describe('PaymentMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders payment method button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /credit card/i })).toBeInTheDocument()
  })

  it('displays payment method icon', () => {
    const { container } = renderComponent()
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('shows tag when provided', () => {
    renderComponent({ tag: 'Popular' })
    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('does not show tag when not provided', () => {
    renderComponent()
    expect(screen.queryByText('Popular')).not.toBeInTheDocument()
  })

  it('calls handleSelectPaymentMethod on button click', async () => {
    renderComponent()
    const button = screen.getByRole('button', { name: /credit card/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockHandleSelectPaymentMethod).toHaveBeenCalledWith(PaymentType.CARD, PaymentStep.SELECT_PAYMENT_METHOD)
    })
  })

  it('disables button when disabled prop is true', () => {
    renderComponent({ disabled: true })
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows "Coming Soon" text for disabled buttons', () => {
    renderComponent({ disabled: true })
    expect(screen.getByRole('button', { name: /coming soon/i })).toBeInTheDocument()
  })

  it('shows custom disabled text when provided', () => {
    renderComponent({ disabled: true, disabledText: 'Not Available' })
    expect(screen.getByRole('button', { name: /not available/i })).toBeInTheDocument()
  })

  it('shows name when disabled with empty disabledText', () => {
    renderComponent({ disabled: true, disabledText: '' })
    expect(screen.getByRole('button', { name: /credit card/i })).toBeInTheDocument()
  })

  it('calls custom onClick handler when provided', async () => {
    const mockOnClick = jest.fn().mockResolvedValue(undefined)
    renderComponent({ onClick: mockOnClick })
    
    const button = screen.getByRole('button', { name: /credit card/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  it('sets payment type when custom onClick is called', async () => {
    const mockOnClick = jest.fn().mockResolvedValue(undefined)
    renderComponent({ onClick: mockOnClick, type: PaymentType.CRYPTO })
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockSetPaymentType).toHaveBeenCalledWith(PaymentType.CRYPTO)
    })
  })

  it('shows loading state during async onClick', async () => {
    const mockOnClick = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    renderComponent({ onClick: mockOnClick })
    
    const button = screen.getByRole('button', { name: /credit card/i })
    fireEvent.click(button)
    
    expect(button).toHaveAttribute('data-loading', 'true')
  })

  it('handles onClick error gracefully', async () => {
    const mockOnClick = jest.fn().mockRejectedValue(new Error('Payment failed'))
    renderComponent({ onClick: mockOnClick })
    
    const button = screen.getByRole('button', { name: /credit card/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(button).not.toHaveAttribute('data-loading', 'true')
    })
  })

  it('renders different icon sizes for different payment steps', () => {
    const { container, rerender } = renderComponent({ step: PaymentStep.SELECT_CRYPTO_NETWORK })
    let icon = container.querySelector('svg')
    expect(icon).toHaveStyle({ height: '4rem' })
    
    renderComponent({ step: PaymentStep.HANDLE_SEND_INVOICE })
    icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('prioritizes custom onClick over context handler', async () => {
    const mockOnClick = jest.fn().mockResolvedValue(undefined)
    renderComponent({ onClick: mockOnClick })
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalled()
      expect(mockHandleSelectPaymentMethod).not.toHaveBeenCalled()
    })
  })

  it('uses context handler when no custom onClick', async () => {
    renderComponent()
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockHandleSelectPaymentMethod).toHaveBeenCalled()
    })
  })

  it('handles missing context gracefully', () => {
    const defaultProps = {
      id: 'card-payment',
      name: 'Credit Card',
      step: PaymentStep.SELECT_PAYMENT_METHOD,
      icon: FaCreditCard,
      type: PaymentType.CARD,
    }

    render(
      <PublicScheduleContext.Provider value={null}>
        <PaymentMethod {...defaultProps} />
      </PublicScheduleContext.Provider>
    )
    
    expect(screen.getByRole('button', { name: /credit card/i })).toBeInTheDocument()
  })

  it('displays correct layout with flex and spacing', () => {
    const { container } = renderComponent()
    const vstack = container.querySelector('[role="button"]')?.parentElement?.parentElement
    expect(vstack).toBeInTheDocument()
  })

  it('shows different payment types correctly', async () => {
    renderComponent({ type: PaymentType.INVOICE, name: 'Invoice' })
    expect(screen.getByRole('button', { name: /invoice/i })).toBeInTheDocument()
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockHandleSelectPaymentMethod).toHaveBeenCalledWith(PaymentType.INVOICE, PaymentStep.SELECT_PAYMENT_METHOD)
    })
  })
})
