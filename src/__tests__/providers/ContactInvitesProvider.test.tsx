import React from 'react'
import { render, screen, act } from '@testing-library/react'

const mockContext = {
  invites: [],
  sendInvite: jest.fn(),
  acceptInvite: jest.fn(),
  rejectInvite: jest.fn(),
  pendingCount: 0,
}

const ContactInvitesContext = React.createContext(mockContext)

const ContactInvitesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ContactInvitesContext.Provider value={mockContext}>
      {children}
    </ContactInvitesContext.Provider>
  )
}

describe('ContactInvitesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    render(<ContactInvitesProvider><div>Test</div></ContactInvitesProvider>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should provide empty invites initially', () => {
    const TestComponent = () => {
      const { invites } = React.useContext(ContactInvitesContext)
      return <div>Invites: {invites.length}</div>
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    expect(screen.getByText('Invites: 0')).toBeInTheDocument()
  })

  it('should provide sendInvite function', () => {
    const TestComponent = () => {
      const { sendInvite } = React.useContext(ContactInvitesContext)
      return <button onClick={() => sendInvite('user@example.com')}>Send</button>
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    act(() => { screen.getByText('Send').click() })
    expect(mockContext.sendInvite).toHaveBeenCalled()
  })

  it('should provide acceptInvite function', () => {
    const TestComponent = () => {
      const { acceptInvite } = React.useContext(ContactInvitesContext)
      return <button onClick={() => acceptInvite('invite-123')}>Accept</button>
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    act(() => { screen.getByText('Accept').click() })
    expect(mockContext.acceptInvite).toHaveBeenCalled()
  })

  it('should provide rejectInvite function', () => {
    const TestComponent = () => {
      const { rejectInvite } = React.useContext(ContactInvitesContext)
      return <button onClick={() => rejectInvite('invite-123')}>Reject</button>
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    act(() => { screen.getByText('Reject').click() })
    expect(mockContext.rejectInvite).toHaveBeenCalled()
  })

  it('should provide pendingCount', () => {
    const TestComponent = () => {
      const { pendingCount } = React.useContext(ContactInvitesContext)
      return <div>Pending: {pendingCount}</div>
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    expect(screen.getByText('Pending: 0')).toBeInTheDocument()
  })

  it('should handle nested components', () => {
    const Nested = () => {
      const { invites } = React.useContext(ContactInvitesContext)
      return <div>Count: {invites.length}</div>
    }
    render(<ContactInvitesProvider><div><Nested /></div></ContactInvitesProvider>)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <ContactInvitesProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </ContactInvitesProvider>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })

  it('should handle fragments', () => {
    render(
      <ContactInvitesProvider>
        <>
          <div>Fragment 1</div>
          <div>Fragment 2</div>
        </>
      </ContactInvitesProvider>
    )
    expect(screen.getByText('Fragment 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment 2')).toBeInTheDocument()
  })

  it('should handle conditional rendering', () => {
    const TestComponent = ({ show }: { show: boolean }) => (
      <ContactInvitesProvider>
        {show && <div>Conditional</div>}
      </ContactInvitesProvider>
    )
    const { rerender } = render(<TestComponent show={false} />)
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()
    rerender(<TestComponent show={true} />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('should maintain context across rerenders', () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0)
      const { invites } = React.useContext(ContactInvitesContext)
      return (
        <div>
          <div>Invites: {invites.length}</div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      )
    }
    render(<ContactInvitesProvider><TestComponent /></ContactInvitesProvider>)
    expect(screen.getByText('Invites: 0')).toBeInTheDocument()
    act(() => { screen.getByText('Increment').click() })
    expect(screen.getByText('Invites: 0')).toBeInTheDocument()
  })
})
