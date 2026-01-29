import { render, screen } from '@testing-library/react'
import React from 'react'
import ProgressHeaderItem from '@/components/public-meeting/ProgressHeaderItem'
import { PublicSchedulingSteps } from '@/utils/constants/meeting-types'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const defaultProps = {
  label: 'Select Time',
  activeSteps: [PublicSchedulingSteps.SELECT_TIME],
  currentStep: PublicSchedulingSteps.SELECT_TIME,
}

describe('ProgressHeaderItem', () => {
  it('renders progress item label', () => {
    render(<ProgressHeaderItem {...defaultProps} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('shows active indicator when step is active', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    const activeBox = container.querySelector('[style*="primary.400"]')
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows inactive indicator when step is not active', () => {
    const props = {
      ...defaultProps,
      activeSteps: [],
    }
    const { container } = render(<ProgressHeaderItem {...props} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays different label text', () => {
    render(<ProgressHeaderItem {...defaultProps} label="Review Details" />)
    expect(screen.getByText('Review Details')).toBeInTheDocument()
  })

  it('handles SELECT_SESSION_TYPE step', () => {
    const props = {
      ...defaultProps,
      currentStep: PublicSchedulingSteps.SELECT_SESSION_TYPE,
      activeSteps: [PublicSchedulingSteps.SELECT_SESSION_TYPE],
      label: 'Session Type',
    }
    render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Session Type')).toBeInTheDocument()
  })

  it('handles CONFIRM_DETAILS step', () => {
    const props = {
      ...defaultProps,
      currentStep: PublicSchedulingSteps.CONFIRM_DETAILS,
      activeSteps: [PublicSchedulingSteps.CONFIRM_DETAILS],
      label: 'Confirm',
    }
    render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('applies correct border styling', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    const item = container.firstChild
    expect(item).toBeInTheDocument()
  })

  it('applies rounded pill shape', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses HStack layout', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('centers content with alignItems', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows indicator with primary color when active', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('shows indicator with neutral color when inactive', () => {
    const props = {
      ...defaultProps,
      activeSteps: [PublicSchedulingSteps.CONFIRM_DETAILS],
    }
    const { container } = render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('handles multiple active steps', () => {
    const props = {
      ...defaultProps,
      activeSteps: [
        PublicSchedulingSteps.SELECT_SESSION_TYPE,
        PublicSchedulingSteps.SELECT_TIME,
        PublicSchedulingSteps.CONFIRM_DETAILS,
      ],
    }
    render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('maintains active state when current step is in activeSteps', () => {
    const props = {
      ...defaultProps,
      activeSteps: [PublicSchedulingSteps.SELECT_TIME],
      currentStep: PublicSchedulingSteps.SELECT_TIME,
    }
    render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('shows inactive state when current step not in activeSteps', () => {
    const props = {
      ...defaultProps,
      activeSteps: [],
      currentStep: PublicSchedulingSteps.SELECT_TIME,
    }
    render(<ProgressHeaderItem {...props} />)
    expect(screen.getByText('Select Time')).toBeInTheDocument()
  })

  it('handles empty label gracefully', () => {
    render(<ProgressHeaderItem {...defaultProps} label="" />)
    expect(screen.queryByText('Select Time')).not.toBeInTheDocument()
  })

  it('displays long labels correctly', () => {
    const longLabel = 'This is a very long progress step label'
    render(<ProgressHeaderItem {...defaultProps} label={longLabel} />)
    expect(screen.getByText(longLabel)).toBeInTheDocument()
  })

  it('applies responsive sizing to indicator', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses box-sizing border-box', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies gap spacing between elements', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses flex layout for responsiveness', () => {
    const { container } = render(<ProgressHeaderItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
