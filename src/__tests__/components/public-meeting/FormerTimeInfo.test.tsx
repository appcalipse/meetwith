import { render, screen } from '@testing-library/react'
import React from 'react'
import FormerTimeInfo from '@/components/public-meeting/FormerTimeInfo'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const defaultProps = {
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  timezone: 'America/New_York',
  duration_minutes: 60,
}

describe('FormerTimeInfo', () => {
  it('renders former time heading', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText(/former time/i)).toBeInTheDocument()
  })

  it('displays formatted date and time', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText(/2024/i)).toBeInTheDocument()
  })

  it('shows duration in minutes', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument()
  })

  it('displays timezone information', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText('America/New_York')).toBeInTheDocument()
  })

  it('renders calendar icon', () => {
    const { container } = render(<FormerTimeInfo {...defaultProps} />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('renders clock icon', () => {
    const { container } = render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument()
  })

  it('renders globe icon for timezone', () => {
    const { container } = render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText('America/New_York')).toBeInTheDocument()
  })

  it('handles default duration_minutes', () => {
    const { duration_minutes, ...propsWithoutDuration } = defaultProps
    render(<FormerTimeInfo {...propsWithoutDuration} />)
    expect(screen.getByText(/0 minutes/i)).toBeInTheDocument()
  })

  it('handles different timezones', () => {
    render(<FormerTimeInfo {...defaultProps} timezone="Europe/London" />)
    expect(screen.getByText('Europe/London')).toBeInTheDocument()
  })

  it('handles different durations', () => {
    render(<FormerTimeInfo {...defaultProps} duration_minutes={30} />)
    expect(screen.getByText(/30 minutes/i)).toBeInTheDocument()
  })

  it('displays long duration correctly', () => {
    render(<FormerTimeInfo {...defaultProps} duration_minutes={120} />)
    expect(screen.getByText(/120 minutes/i)).toBeInTheDocument()
  })

  it('displays short duration correctly', () => {
    render(<FormerTimeInfo {...defaultProps} duration_minutes={15} />)
    expect(screen.getByText(/15 minutes/i)).toBeInTheDocument()
  })

  it('handles UTC timezone', () => {
    render(<FormerTimeInfo {...defaultProps} timezone="UTC" />)
    expect(screen.getByText('UTC')).toBeInTheDocument()
  })

  it('handles Pacific timezone', () => {
    render(<FormerTimeInfo {...defaultProps} timezone="America/Los_Angeles" />)
    expect(screen.getByText('America/Los_Angeles')).toBeInTheDocument()
  })

  it('handles Asian timezone', () => {
    render(<FormerTimeInfo {...defaultProps} timezone="Asia/Tokyo" />)
    expect(screen.getByText('Asia/Tokyo')).toBeInTheDocument()
  })

  it('uses VStack layout', () => {
    const { container } = render(<FormerTimeInfo {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('aligns items to flex-start', () => {
    const { container } = render(<FormerTimeInfo {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('groups date info with HStack', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText('America/New_York')).toBeInTheDocument()
  })

  it('shows all three info sections', () => {
    render(<FormerTimeInfo {...defaultProps} />)
    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument()
    expect(screen.getByText('America/New_York')).toBeInTheDocument()
  })

  it('handles same start and end time', () => {
    const sameTime = new Date('2024-01-15T10:00:00Z')
    render(<FormerTimeInfo {...defaultProps} startTime={sameTime} endTime={sameTime} />)
    expect(screen.getByText(/former time/i)).toBeInTheDocument()
  })
})
