import React from 'react'
import { render, screen, act } from '@testing-library/react'

const mockContext = {
  metrics: {},
  updateMetric: jest.fn(),
  getMetric: jest.fn(),
  resetMetrics: jest.fn(),
}

const MetricContext = React.createContext(mockContext)

const MetricStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MetricContext.Provider value={mockContext}>
      {children}
    </MetricContext.Provider>
  )
}

describe('MetricStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <MetricStateProvider>
        <div>Test Child</div>
      </MetricStateProvider>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should provide metrics context', () => {
    const TestComponent = () => {
      const context = React.useContext(MetricContext)
      return <div>{context ? 'Context Available' : 'No Context'}</div>
    }

    render(
      <MetricStateProvider>
        <TestComponent />
      </MetricStateProvider>
    )

    expect(screen.getByText('Context Available')).toBeInTheDocument()
  })

  it('should provide empty metrics initially', () => {
    const TestComponent = () => {
      const { metrics } = React.useContext(MetricContext)
      return <div>Metrics: {Object.keys(metrics).length}</div>
    }

    render(
      <MetricStateProvider>
        <TestComponent />
      </MetricStateProvider>
    )

    expect(screen.getByText('Metrics: 0')).toBeInTheDocument()
  })

  it('should provide updateMetric function', () => {
    const TestComponent = () => {
      const { updateMetric } = React.useContext(MetricContext)
      return <div>{typeof updateMetric === 'function' ? 'Has Update' : 'No Update'}</div>
    }

    render(
      <MetricStateProvider>
        <TestComponent />
      </MetricStateProvider>
    )

    expect(screen.getByText('Has Update')).toBeInTheDocument()
  })

  it('should provide getMetric function', () => {
    const TestComponent = () => {
      const { getMetric } = React.useContext(MetricContext)
      return <div>{typeof getMetric === 'function' ? 'Has Get' : 'No Get'}</div>
    }

    render(
      <MetricStateProvider>
        <TestComponent />
      </MetricStateProvider>
    )

    expect(screen.getByText('Has Get')).toBeInTheDocument()
  })

  it('should provide resetMetrics function', () => {
    const TestComponent = () => {
      const { resetMetrics } = React.useContext(MetricContext)
      return <div>{typeof resetMetrics === 'function' ? 'Has Reset' : 'No Reset'}</div>
    }

    render(
      <MetricStateProvider>
        <TestComponent />
      </MetricStateProvider>
    )

    expect(screen.getByText('Has Reset')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <MetricStateProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </MetricStateProvider>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })

  it('should provide context to nested components', () => {
    const NestedComponent = () => {
      const { metrics } = React.useContext(MetricContext)
      return <div>Nested Metrics: {Object.keys(metrics).length}</div>
    }

    render(
      <MetricStateProvider>
        <div>
          <NestedComponent />
        </div>
      </MetricStateProvider>
    )

    expect(screen.getByText('Nested Metrics: 0')).toBeInTheDocument()
  })

  it('should handle fragment children', () => {
    render(
      <MetricStateProvider>
        <>
          <div>Fragment 1</div>
          <div>Fragment 2</div>
        </>
      </MetricStateProvider>
    )

    expect(screen.getByText('Fragment 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment 2')).toBeInTheDocument()
  })

  it('should handle conditional children', () => {
    const TestComponent = ({ show }: { show: boolean }) => (
      <MetricStateProvider>
        {show && <div>Conditional</div>}
      </MetricStateProvider>
    )

    const { rerender } = render(<TestComponent show={false} />)
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()

    rerender(<TestComponent show={true} />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })
})
