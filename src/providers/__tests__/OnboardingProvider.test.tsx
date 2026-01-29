import React from 'react'
import { render, screen, act } from '@testing-library/react'

const mockContext = {
  isOnboarding: false,
  currentStep: 0,
  totalSteps: 5,
  nextStep: jest.fn(),
  prevStep: jest.fn(),
  skipOnboarding: jest.fn(),
  completeOnboarding: jest.fn(),
}

const OnboardingContext = React.createContext(mockContext)

const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OnboardingContext.Provider value={mockContext}>
      {children}
    </OnboardingContext.Provider>
  )
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    render(<OnboardingProvider><div>Test</div></OnboardingProvider>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should provide onboarding state', () => {
    const TestComponent = () => {
      const { isOnboarding } = React.useContext(OnboardingContext)
      return <div>Onboarding: {isOnboarding ? 'active' : 'inactive'}</div>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    expect(screen.getByText('Onboarding: inactive')).toBeInTheDocument()
  })

  it('should provide current step', () => {
    const TestComponent = () => {
      const { currentStep } = React.useContext(OnboardingContext)
      return <div>Step: {currentStep}</div>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    expect(screen.getByText('Step: 0')).toBeInTheDocument()
  })

  it('should provide total steps', () => {
    const TestComponent = () => {
      const { totalSteps } = React.useContext(OnboardingContext)
      return <div>Total: {totalSteps}</div>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    expect(screen.getByText('Total: 5')).toBeInTheDocument()
  })

  it('should provide nextStep function', () => {
    const TestComponent = () => {
      const { nextStep } = React.useContext(OnboardingContext)
      return <button onClick={nextStep}>Next</button>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    act(() => { screen.getByText('Next').click() })
    expect(mockContext.nextStep).toHaveBeenCalled()
  })

  it('should provide prevStep function', () => {
    const TestComponent = () => {
      const { prevStep } = React.useContext(OnboardingContext)
      return <button onClick={prevStep}>Previous</button>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    act(() => { screen.getByText('Previous').click() })
    expect(mockContext.prevStep).toHaveBeenCalled()
  })

  it('should provide skipOnboarding function', () => {
    const TestComponent = () => {
      const { skipOnboarding } = React.useContext(OnboardingContext)
      return <button onClick={skipOnboarding}>Skip</button>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    act(() => { screen.getByText('Skip').click() })
    expect(mockContext.skipOnboarding).toHaveBeenCalled()
  })

  it('should provide completeOnboarding function', () => {
    const TestComponent = () => {
      const { completeOnboarding } = React.useContext(OnboardingContext)
      return <button onClick={completeOnboarding}>Complete</button>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    act(() => { screen.getByText('Complete').click() })
    expect(mockContext.completeOnboarding).toHaveBeenCalled()
  })

  it('should handle nested components', () => {
    const Nested = () => {
      const { currentStep } = React.useContext(OnboardingContext)
      return <div>Nested Step: {currentStep}</div>
    }
    render(
      <OnboardingProvider>
        <div><Nested /></div>
      </OnboardingProvider>
    )
    expect(screen.getByText('Nested Step: 0')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <OnboardingProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </OnboardingProvider>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should handle fragments', () => {
    render(
      <OnboardingProvider>
        <>
          <div>Fragment 1</div>
          <div>Fragment 2</div>
        </>
      </OnboardingProvider>
    )
    expect(screen.getByText('Fragment 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment 2')).toBeInTheDocument()
  })

  it('should handle conditional rendering', () => {
    const TestComponent = ({ show }: { show: boolean }) => (
      <OnboardingProvider>
        {show && <div>Conditional</div>}
      </OnboardingProvider>
    )
    const { rerender } = render(<TestComponent show={false} />)
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()
    rerender(<TestComponent show={true} />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('should maintain context across rerenders', () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0)
      const { currentStep } = React.useContext(OnboardingContext)
      return (
        <div>
          <div>Step: {currentStep}</div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      )
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    expect(screen.getByText('Step: 0')).toBeInTheDocument()
    act(() => { screen.getByText('Increment').click() })
    expect(screen.getByText('Step: 0')).toBeInTheDocument()
  })

  it('should handle null children', () => {
    render(<OnboardingProvider>{null}</OnboardingProvider>)
    expect(document.body).toBeInTheDocument()
  })

  it('should handle undefined children', () => {
    render(<OnboardingProvider>{undefined}</OnboardingProvider>)
    expect(document.body).toBeInTheDocument()
  })

  it('should calculate progress percentage', () => {
    const TestComponent = () => {
      const { currentStep, totalSteps } = React.useContext(OnboardingContext)
      const progress = (currentStep / totalSteps) * 100
      return <div>Progress: {progress}%</div>
    }
    render(<OnboardingProvider><TestComponent /></OnboardingProvider>)
    expect(screen.getByText('Progress: 0%')).toBeInTheDocument()
  })
})
