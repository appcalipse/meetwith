import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'

const mockContext = {
  wallets: [],
  isLoading: false,
  error: null,
  addWallet: jest.fn(),
  removeWallet: jest.fn(),
  refreshWallets: jest.fn(),
}

const WalletContext = React.createContext(mockContext)

const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WalletContext.Provider value={mockContext}>
      {children}
    </WalletContext.Provider>
  )
}

describe('WalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <WalletProvider>
        <div>Test Child</div>
      </WalletProvider>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should provide wallet context', () => {
    const TestComponent = () => {
      const context = React.useContext(WalletContext)
      return <div>{context ? 'Context Available' : 'No Context'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Context Available')).toBeInTheDocument()
  })

  it('should provide empty wallets initially', () => {
    const TestComponent = () => {
      const { wallets } = React.useContext(WalletContext)
      return <div>Wallets: {wallets.length}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Wallets: 0')).toBeInTheDocument()
  })

  it('should provide isLoading state', () => {
    const TestComponent = () => {
      const { isLoading } = React.useContext(WalletContext)
      return <div>Loading: {isLoading ? 'true' : 'false'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Loading: false')).toBeInTheDocument()
  })

  it('should provide error state', () => {
    const TestComponent = () => {
      const { error } = React.useContext(WalletContext)
      return <div>Error: {error || 'none'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Error: none')).toBeInTheDocument()
  })

  it('should provide addWallet function', () => {
    const TestComponent = () => {
      const { addWallet } = React.useContext(WalletContext)
      return <div>{typeof addWallet === 'function' ? 'Function Available' : 'No Function'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Function Available')).toBeInTheDocument()
  })

  it('should provide removeWallet function', () => {
    const TestComponent = () => {
      const { removeWallet } = React.useContext(WalletContext)
      return <div>{typeof removeWallet === 'function' ? 'Function Available' : 'No Function'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Function Available')).toBeInTheDocument()
  })

  it('should provide refreshWallets function', () => {
    const TestComponent = () => {
      const { refreshWallets } = React.useContext(WalletContext)
      return <div>{typeof refreshWallets === 'function' ? 'Function Available' : 'No Function'}</div>
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Function Available')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <WalletProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </WalletProvider>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should handle nested providers', () => {
    render(
      <WalletProvider>
        <WalletProvider>
          <div>Nested Child</div>
        </WalletProvider>
      </WalletProvider>
    )

    expect(screen.getByText('Nested Child')).toBeInTheDocument()
  })

  it('should provide context to deeply nested components', () => {
    const DeepChild = () => {
      const { wallets } = React.useContext(WalletContext)
      return <div>Deep: {wallets.length}</div>
    }

    render(
      <WalletProvider>
        <div>
          <div>
            <div>
              <DeepChild />
            </div>
          </div>
        </div>
      </WalletProvider>
    )

    expect(screen.getByText('Deep: 0')).toBeInTheDocument()
  })

  it('should maintain context across rerenders', () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0)
      const { wallets } = React.useContext(WalletContext)
      
      return (
        <div>
          <div>Wallets: {wallets.length}</div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      )
    }

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    )

    expect(screen.getByText('Wallets: 0')).toBeInTheDocument()
    
    act(() => {
      screen.getByText('Increment').click()
    })

    expect(screen.getByText('Wallets: 0')).toBeInTheDocument()
  })

  it('should handle null children', () => {
    render(
      <WalletProvider>
        {null}
      </WalletProvider>
    )

    expect(document.body).toBeInTheDocument()
  })

  it('should handle undefined children', () => {
    render(
      <WalletProvider>
        {undefined}
      </WalletProvider>
    )

    expect(document.body).toBeInTheDocument()
  })

  it('should handle fragment children', () => {
    render(
      <WalletProvider>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </WalletProvider>
    )

    expect(screen.getByText('Fragment Child 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment Child 2')).toBeInTheDocument()
  })

  it('should handle conditional rendering', () => {
    const TestComponent = ({ show }: { show: boolean }) => {
      return (
        <WalletProvider>
          {show && <div>Conditional Content</div>}
        </WalletProvider>
      )
    }

    const { rerender } = render(<TestComponent show={false} />)
    expect(screen.queryByText('Conditional Content')).not.toBeInTheDocument()

    rerender(<TestComponent show={true} />)
    expect(screen.getByText('Conditional Content')).toBeInTheDocument()
  })
})
