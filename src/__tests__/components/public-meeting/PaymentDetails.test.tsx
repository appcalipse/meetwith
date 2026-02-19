import { render, screen } from '@testing-library/react'
import React from 'react'
import PaymentDetails from '@/components/public-meeting/PaymentDetails'
import { PublicScheduleContext } from '@/components/public-meeting/index'
import { PaymentType } from '@/utils/constants/meeting-types'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockSelectedType = {
  id: '1',
  title: 'Premium Consultation',
  plan: {
    no_of_slot: 3,
    price_per_slot: 50,
  },
}

const renderComponent = (contextValue: any = {}) => {
  const defaultContext = {
    selectedType: mockSelectedType,
    paymentType: PaymentType.CARD,
    ...contextValue
  }

  return render(
    <PublicScheduleContext.Provider value={defaultContext}>
      <PaymentDetails />
    </PublicScheduleContext.Provider>
  )
}

describe('PaymentDetails', () => {
  it('renders payment details section', () => {
    renderComponent()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Number of Sessions')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
  })

  it('displays plan title correctly', () => {
    renderComponent()
    expect(screen.getByText('Premium Consultation')).toBeInTheDocument()
  })

  it('shows correct number of sessions', () => {
    renderComponent()
    expect(screen.getByText('3 sessions')).toBeInTheDocument()
  })

  it('calculates and displays total price', () => {
    renderComponent()
    expect(screen.getByText('$150.00')).toBeInTheDocument() // 3 * $50
  })

  it('displays "Card" for FIAT payment type', () => {
    renderComponent({ paymentType: PaymentType.FIAT })
    expect(screen.getByText('Card')).toBeInTheDocument()
  })

  it('displays "Crypto" for CARD payment type', () => {
    renderComponent({ paymentType: PaymentType.CARD })
    expect(screen.getByText('Crypto')).toBeInTheDocument()
  })

  it('displays "Crypto" for CRYPTO payment type', () => {
    renderComponent({ paymentType: PaymentType.CRYPTO })
    expect(screen.getByText('Crypto')).toBeInTheDocument()
  })

  it('handles different session counts', () => {
    const customType = {
      ...mockSelectedType,
      plan: { ...mockSelectedType.plan, no_of_slot: 10 }
    }
    renderComponent({ selectedType: customType })
    expect(screen.getByText('10 sessions')).toBeInTheDocument()
    expect(screen.getByText('$500.00')).toBeInTheDocument() // 10 * $50
  })

  it('handles different price per slot', () => {
    const customType = {
      ...mockSelectedType,
      plan: { ...mockSelectedType.plan, price_per_slot: 100 }
    }
    renderComponent({ selectedType: customType })
    expect(screen.getByText('$300.00')).toBeInTheDocument() // 3 * $100
  })

  it('displays $0 when no plan is provided', () => {
    const noPlannType = {
      ...mockSelectedType,
      plan: null
    }
    renderComponent({ selectedType: noPlannType })
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('renders with proper border styling', () => {
    const { container } = renderComponent()
    const detailItems = container.querySelectorAll('[style*="border"]')
    expect(detailItems.length).toBeGreaterThan(0)
  })

  it('displays all details in correct order', () => {
    renderComponent()
    const labels = ['Plan', 'Number of Sessions', 'Price', 'Payment Method']
    labels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('handles missing selectedType gracefully', () => {
    renderComponent({ selectedType: null })
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('formats currency with 2 decimal places', () => {
    const customType = {
      ...mockSelectedType,
      plan: { no_of_slot: 1, price_per_slot: 99.5 }
    }
    renderComponent({ selectedType: customType })
    expect(screen.getByText('$99.50')).toBeInTheDocument()
  })

  it('handles large prices correctly', () => {
    const expensiveType = {
      ...mockSelectedType,
      plan: { no_of_slot: 10, price_per_slot: 999 }
    }
    renderComponent({ selectedType: expensiveType })
    expect(screen.getByText('$9,990.00')).toBeInTheDocument()
  })

  it('shows correct spacing between detail items', () => {
    const { container } = renderComponent()
    const vstack = container.querySelector('[class*="chakra"]')
    expect(vstack).toBeInTheDocument()
  })

  it('displays invoice payment type as Crypto', () => {
    renderComponent({ paymentType: PaymentType.INVOICE })
    expect(screen.getByText('Crypto')).toBeInTheDocument()
  })
})
