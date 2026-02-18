import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/EmptyState'

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(<EmptyState title="No Data" description="No items found" />)
    
    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('should render with default image', () => {
    render(<EmptyState title="Empty" description="Nothing here" />)
    
    const image = screen.getByAltText('Empty state illustration')
    expect(image).toBeInTheDocument()
  })

  it('should render with custom image', () => {
    render(
      <EmptyState
        title="Custom"
        description="Test"
        imageSrc="/custom.svg"
        imageAlt="Custom image"
      />
    )
    
    const image = screen.getByAltText('Custom image')
    expect(image).toBeInTheDocument()
  })

  it('should apply correct styling', () => {
    const { container } = render(<EmptyState title="Test" description="Description" />)
    
    const box = container.firstChild as HTMLElement
    expect(box).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    })
  })

  it('should have correct text styling', () => {
    render(<EmptyState title="Title" description="Description" />)
    
    const title = screen.getByText('Title')
    const description = screen.getByText('Description')
    
    expect(title).toHaveStyle({
      fontSize: '20px',
      fontWeight: '600',
    })
    
    expect(description).toHaveStyle({
      fontSize: '16px',
    })
  })
})
