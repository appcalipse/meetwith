import { render, screen } from '@testing-library/react'
import CalendarViewPage from '../calendar-view'

jest.mock('@/components/calendar-view', () => ({
  __esModule: true,
  default: () => <div data-testid="calendar-view">Calendar View Component</div>,
}))

describe('CalendarViewPage', () => {
  it('should render calendar view component', () => {
    render(<CalendarViewPage />)
    expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
  })

  it('should render calendar view text', () => {
    render(<CalendarViewPage />)
    expect(screen.getByText('Calendar View Component')).toBeInTheDocument()
  })
})
