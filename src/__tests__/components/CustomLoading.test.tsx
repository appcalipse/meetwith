import { render, screen } from '@testing-library/react'
import CustomLoading from '@/components/CustomLoading'

describe('CustomLoading', () => {
  it('should render with default text', () => {
    render(<CustomLoading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render with custom text', () => {
    render(<CustomLoading text="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('should render image', () => {
    render(<CustomLoading />)
    const image = screen.getByAltText('Loading...')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/assets/schedule.svg')
  })

  it('should render spinner', () => {
    const { container } = render(<CustomLoading />)
    const spinner = container.querySelector('.chakra-spinner')
    expect(spinner).toBeInTheDocument()
  })

  it('should have correct styling', () => {
    const { container } = render(<CustomLoading />)
    const box = container.firstChild as HTMLElement
    expect(box).toHaveStyle({
      width: '100%',
      height: '100%',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })
  })
})
