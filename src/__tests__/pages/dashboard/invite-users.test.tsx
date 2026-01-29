import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/router'
import InviteUsersPage from '../invite-users'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/group/GroupInviteForm', () => ({
  __esModule: true,
  default: ({ groupId, groupName, onClose }: any) => (
    <div data-testid="group-invite-form">
      <span data-testid="form-group-id">{groupId}</span>
      <span data-testid="form-group-name">{groupName}</span>
      <span data-testid="form-on-close">{String(onClose)}</span>
    </div>
  ),
}))

describe('InviteUsersPage', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: { groupName: 'Test Group', groupId: 'group-123' },
    })
  })

  it('should render invite users page', () => {
    render(<InviteUsersPage />)
    expect(screen.getByText('Invite users')).toBeInTheDocument()
  })

  it('should render description text', () => {
    render(<InviteUsersPage />)
    expect(
      screen.getByText(/Enter the identifier of members you want to invite/i)
    ).toBeInTheDocument()
  })

  it('should render close button', () => {
    render(<InviteUsersPage />)
    const closeButton = screen.getByLabelText('Close invite users')
    expect(closeButton).toBeInTheDocument()
  })

  it('should navigate to groups page on close', () => {
    render(<InviteUsersPage />)
    const closeButton = screen.getByLabelText('Close invite users')
    fireEvent.click(closeButton)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/GROUPS')
  })

  it('should pass groupId from query to form', () => {
    render(<InviteUsersPage />)
    expect(screen.getByTestId('form-group-id')).toHaveTextContent('group-123')
  })

  it('should pass groupName from query to form', () => {
    render(<InviteUsersPage />)
    expect(screen.getByTestId('form-group-name')).toHaveTextContent('Test Group')
  })

  it('should handle array groupId', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: { groupId: ['group-1', 'group-2'], groupName: 'Test' },
    })
    render(<InviteUsersPage />)
    expect(screen.getByTestId('form-group-id')).toHaveTextContent('group-1')
  })

  it('should handle array groupName', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: { groupId: 'group-123', groupName: ['Name1', 'Name2'] },
    })
    render(<InviteUsersPage />)
    expect(screen.getByTestId('form-group-name')).toHaveTextContent('Name1')
  })

  it('should pass onClose prop as true', () => {
    render(<InviteUsersPage />)
    expect(screen.getByTestId('form-on-close')).toHaveTextContent('true')
  })

  it('should render with undefined query params', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: {},
    })
    render(<InviteUsersPage />)
    expect(screen.getByTestId('group-invite-form')).toBeInTheDocument()
  })
})
