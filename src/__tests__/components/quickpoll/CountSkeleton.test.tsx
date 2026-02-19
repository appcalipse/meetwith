import { render } from '@testing-library/react'
import React from 'react'
import CountSkeleton from '@/components/quickpoll/CountSkeleton'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('CountSkeleton', () => {
  it('renders skeleton loader', () => {
    const { container } = render(<CountSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has correct height', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ height: '14px' })
  })

  it('has correct width', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ width: '14px' })
  })

  it('has border radius', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ borderRadius: '4px' })
  })

  it('displays inline-block', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ display: 'inline-block' })
  })

  it('has reduced opacity', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ opacity: 0.4 })
  })

  it('renders without errors', () => {
    expect(() => render(<CountSkeleton />)).not.toThrow()
  })

  it('renders consistently', () => {
    const { container: container1 } = render(<CountSkeleton />)
    const { container: container2 } = render(<CountSkeleton />)
    expect(container1.firstChild).toBeTruthy()
    expect(container2.firstChild).toBeTruthy()
  })

  it('can be rendered multiple times', () => {
    const { container } = render(
      <div>
        <CountSkeleton />
        <CountSkeleton />
        <CountSkeleton />
      </div>
    )
    const skeletons = container.querySelectorAll('[class*="chakra"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('maintains square dimensions', () => {
    const { container } = render(<CountSkeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ height: '14px', width: '14px' })
  })
})
