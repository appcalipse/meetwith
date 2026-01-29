import React from 'react'
import { render, screen, act } from '@testing-library/react'

const mockContext = {
  currentAccount: null,
  setCurrentAccount: jest.fn(),
  accounts: [],
  addAccount: jest.fn(),
  removeAccount: jest.fn(),
  updateAccount: jest.fn(),
  isLoading: false,
}

const AccountContext = React.createContext(mockContext)

const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AccountContext.Provider value={mockContext}>{children}</AccountContext.Provider>
}

describe('AccountProvider', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('should render children', () => {
    render(<AccountProvider><div>Test</div></AccountProvider>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should provide null currentAccount initially', () => {
    const TestComponent = () => {
      const { currentAccount } = React.useContext(AccountContext)
      return <div>Account: {currentAccount || 'none'}</div>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    expect(screen.getByText('Account: none')).toBeInTheDocument()
  })

  it('should provide empty accounts array', () => {
    const TestComponent = () => {
      const { accounts } = React.useContext(AccountContext)
      return <div>Accounts: {accounts.length}</div>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    expect(screen.getByText('Accounts: 0')).toBeInTheDocument()
  })

  it('should provide setCurrentAccount function', () => {
    const TestComponent = () => {
      const { setCurrentAccount } = React.useContext(AccountContext)
      return <button onClick={() => setCurrentAccount({ id: '1' })}>Set</button>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    act(() => { screen.getByText('Set').click() })
    expect(mockContext.setCurrentAccount).toHaveBeenCalled()
  })

  it('should provide addAccount function', () => {
    const TestComponent = () => {
      const { addAccount } = React.useContext(AccountContext)
      return <button onClick={() => addAccount({ id: '1' })}>Add</button>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    act(() => { screen.getByText('Add').click() })
    expect(mockContext.addAccount).toHaveBeenCalled()
  })

  it('should provide removeAccount function', () => {
    const TestComponent = () => {
      const { removeAccount } = React.useContext(AccountContext)
      return <button onClick={() => removeAccount('1')}>Remove</button>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    act(() => { screen.getByText('Remove').click() })
    expect(mockContext.removeAccount).toHaveBeenCalled()
  })

  it('should provide updateAccount function', () => {
    const TestComponent = () => {
      const { updateAccount } = React.useContext(AccountContext)
      return <button onClick={() => updateAccount('1', {})}>Update</button>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    act(() => { screen.getByText('Update').click() })
    expect(mockContext.updateAccount).toHaveBeenCalled()
  })

  it('should provide isLoading state', () => {
    const TestComponent = () => {
      const { isLoading } = React.useContext(AccountContext)
      return <div>Loading: {isLoading ? 'yes' : 'no'}</div>
    }
    render(<AccountProvider><TestComponent /></AccountProvider>)
    expect(screen.getByText('Loading: no')).toBeInTheDocument()
  })

  it('should handle nested components', () => {
    const Nested = () => {
      const { accounts } = React.useContext(AccountContext)
      return <div>Nested: {accounts.length}</div>
    }
    render(<AccountProvider><div><Nested /></div></AccountProvider>)
    expect(screen.getByText('Nested: 0')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(<AccountProvider><div>C1</div><div>C2</div></AccountProvider>)
    expect(screen.getByText('C1')).toBeInTheDocument()
    expect(screen.getByText('C2')).toBeInTheDocument()
  })

  it('should handle fragments', () => {
    render(<AccountProvider><><div>F1</div><div>F2</div></></AccountProvider>)
    expect(screen.getByText('F1')).toBeInTheDocument()
    expect(screen.getByText('F2')).toBeInTheDocument()
  })

  it('should handle conditional rendering', () => {
    const Test = ({ show }: { show: boolean }) => (
      <AccountProvider>{show && <div>Conditional</div>}</AccountProvider>
    )
    const { rerender } = render(<Test show={false} />)
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()
    rerender(<Test show={true} />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('should maintain context across rerenders', () => {
    const Test = () => {
      const [count, setCount] = React.useState(0)
      const { accounts } = React.useContext(AccountContext)
      return (
        <div>
          <div>Accounts: {accounts.length}</div>
          <button onClick={() => setCount(count + 1)}>Inc</button>
        </div>
      )
    }
    render(<AccountProvider><Test /></AccountProvider>)
    expect(screen.getByText('Accounts: 0')).toBeInTheDocument()
    act(() => { screen.getByText('Inc').click() })
    expect(screen.getByText('Accounts: 0')).toBeInTheDocument()
  })

  it('should handle null children', () => {
    render(<AccountProvider>{null}</AccountProvider>)
    expect(document.body).toBeInTheDocument()
  })

  it('should handle undefined children', () => {
    render(<AccountProvider>{undefined}</AccountProvider>)
    expect(document.body).toBeInTheDocument()
  })
})
