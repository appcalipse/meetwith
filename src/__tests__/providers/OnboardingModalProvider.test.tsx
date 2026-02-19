import React from 'react'
import { render, screen, act } from '@testing-library/react'

const mockContext = {
  isOpen: false,
  openModal: jest.fn(),
  closeModal: jest.fn(),
  modalContent: null,
  setModalContent: jest.fn(),
}

const OnboardingModalContext = React.createContext(mockContext)

const OnboardingModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OnboardingModalContext.Provider value={mockContext}>
      {children}
    </OnboardingModalContext.Provider>
  )
}

describe('OnboardingModalProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    render(<OnboardingModalProvider><div>Test</div></OnboardingModalProvider>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should provide closed state initially', () => {
    const TestComponent = () => {
      const { isOpen } = React.useContext(OnboardingModalContext)
      return <div>Open: {isOpen ? 'yes' : 'no'}</div>
    }
    render(<OnboardingModalProvider><TestComponent /></OnboardingModalProvider>)
    expect(screen.getByText('Open: no')).toBeInTheDocument()
  })

  it('should provide openModal function', () => {
    const TestComponent = () => {
      const { openModal } = React.useContext(OnboardingModalContext)
      return <button onClick={openModal}>Open</button>
    }
    render(<OnboardingModalProvider><TestComponent /></OnboardingModalProvider>)
    act(() => { screen.getByText('Open').click() })
    expect(mockContext.openModal).toHaveBeenCalled()
  })

  it('should provide closeModal function', () => {
    const TestComponent = () => {
      const { closeModal } = React.useContext(OnboardingModalContext)
      return <button onClick={closeModal}>Close</button>
    }
    render(<OnboardingModalProvider><TestComponent /></OnboardingModalProvider>)
    act(() => { screen.getByText('Close').click() })
    expect(mockContext.closeModal).toHaveBeenCalled()
  })

  it('should provide null modalContent initially', () => {
    const TestComponent = () => {
      const { modalContent } = React.useContext(OnboardingModalContext)
      return <div>Content: {modalContent || 'none'}</div>
    }
    render(<OnboardingModalProvider><TestComponent /></OnboardingModalProvider>)
    expect(screen.getByText('Content: none')).toBeInTheDocument()
  })

  it('should provide setModalContent function', () => {
    const TestComponent = () => {
      const { setModalContent } = React.useContext(OnboardingModalContext)
      return <button onClick={() => setModalContent('Test Content')}>Set</button>
    }
    render(<OnboardingModalProvider><TestComponent /></OnboardingModalProvider>)
    act(() => { screen.getByText('Set').click() })
    expect(mockContext.setModalContent).toHaveBeenCalledWith('Test Content')
  })

  it('should handle nested components', () => {
    const Nested = () => {
      const { isOpen } = React.useContext(OnboardingModalContext)
      return <div>Nested: {isOpen ? 'open' : 'closed'}</div>
    }
    render(<OnboardingModalProvider><div><Nested /></div></OnboardingModalProvider>)
    expect(screen.getByText('Nested: closed')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <OnboardingModalProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </OnboardingModalProvider>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })

  it('should handle fragments', () => {
    render(
      <OnboardingModalProvider>
        <>
          <div>Fragment 1</div>
          <div>Fragment 2</div>
        </>
      </OnboardingModalProvider>
    )
    expect(screen.getByText('Fragment 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment 2')).toBeInTheDocument()
  })

  it('should handle conditional rendering', () => {
    const TestComponent = ({ show }: { show: boolean }) => (
      <OnboardingModalProvider>
        {show && <div>Conditional</div>}
      </OnboardingModalProvider>
    )
    const { rerender } = render(<TestComponent show={false} />)
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()
    rerender(<TestComponent show={true} />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })
})
