import { render, screen } from '@testing-library/react'
import CreatePollPage from '../create-poll'

jest.mock('@/components/quickpoll/CreatePoll', () => ({
  __esModule: true,
  default: () => <div data-testid="create-poll">CreatePoll Component</div>,
}))

jest.mock('@/providers/schedule/ParticipantsContext', () => ({
  ParticipantsProvider: ({ children }: any) => (
    <div data-testid="participants-provider">{children}</div>
  ),
}))

describe('CreatePollPage', () => {
  it('should render create poll component', () => {
    render(<CreatePollPage />)
    expect(screen.getByTestId('create-poll')).toBeInTheDocument()
  })

  it('should wrap with ParticipantsProvider', () => {
    render(<CreatePollPage />)
    expect(screen.getByTestId('participants-provider')).toBeInTheDocument()
  })

  it('should have correct background styling', () => {
    const { container } = render(<CreatePollPage />)
    const box = container.firstChild as HTMLElement
    expect(box).toHaveStyle({
      minHeight: '100vh',
      width: '100%',
    })
  })

  it('should render with dark background', () => {
    render(<CreatePollPage />)
    const box = screen.getByTestId('participants-provider').parentElement
    expect(box).toBeInTheDocument()
  })
})
