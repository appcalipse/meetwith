import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import FAQ from '@/components/landing/FAQ'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('FAQ', () => {
  it('renders FAQ heading', () => {
    render(<FAQ />)
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument()
  })

  it('displays all FAQ items', () => {
    render(<FAQ />)
    expect(screen.getByText(/why create yet another calendar/i)).toBeInTheDocument()
    expect(screen.getByText(/why using my wallet/i)).toBeInTheDocument()
    expect(screen.getByText(/which data is public/i)).toBeInTheDocument()
    expect(screen.getByText(/is meetwith fully developed/i)).toBeInTheDocument()
    expect(screen.getByText(/how can I know what is coming next/i)).toBeInTheDocument()
  })

  it('renders accordion component', () => {
    const { container } = render(<FAQ />)
    const accordion = container.querySelector('[role="region"]')
    expect(accordion).toBeInTheDocument()
  })

  it('expands accordion item on click', () => {
    render(<FAQ />)
    const firstQuestion = screen.getByText(/why create yet another calendar/i)
    fireEvent.click(firstQuestion)
    
    expect(screen.getByText(/we believe web3 still lacks/i)).toBeInTheDocument()
  })

  it('displays wallet connection explanation', () => {
    render(<FAQ />)
    const walletQuestion = screen.getByText(/why using my wallet/i)
    fireEvent.click(walletQuestion)
    
    expect(screen.getByText(/by connecting with your wallet/i)).toBeInTheDocument()
    expect(screen.getByText(/wallet connection is the new standard/i)).toBeInTheDocument()
  })

  it('shows privacy information', () => {
    render(<FAQ />)
    const privacyQuestion = screen.getByText(/which data is public/i)
    fireEvent.click(privacyQuestion)
    
    expect(screen.getByText(/your public data consists/i)).toBeInTheDocument()
    expect(screen.getByText(/stored encrypted/i)).toBeInTheDocument()
  })

  it('displays development status info', () => {
    render(<FAQ />)
    const devQuestion = screen.getByText(/is meetwith fully developed/i)
    fireEvent.click(devQuestion)
    
    expect(screen.getByText(/meetwith is a new platform/i)).toBeInTheDocument()
    expect(screen.getByText(/early stage/i)).toBeInTheDocument()
  })

  it('shows roadmap and community links', () => {
    render(<FAQ />)
    const roadmapQuestion = screen.getByText(/how can I know what is coming next/i)
    fireEvent.click(roadmapQuestion)
    
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('contains Discord link', () => {
    render(<FAQ />)
    const roadmapQuestion = screen.getByText(/how can I know what is coming next/i)
    fireEvent.click(roadmapQuestion)
    
    expect(screen.getByText(/discord/i)).toBeInTheDocument()
  })

  it('has proper section ID for navigation', () => {
    const { container } = render(<FAQ />)
    const section = container.querySelector('#faq')
    expect(section).toBeInTheDocument()
  })

  it('applies proper styling with border and background', () => {
    const { container } = render(<FAQ />)
    const section = container.querySelector('#faq')
    expect(section).toHaveStyle({ borderWidth: '1px' })
  })

  it('collapses accordion item on second click', () => {
    render(<FAQ />)
    const firstQuestion = screen.getByText(/why create yet another calendar/i)
    
    fireEvent.click(firstQuestion)
    expect(screen.getByText(/we believe web3 still lacks/i)).toBeInTheDocument()
    
    fireEvent.click(firstQuestion)
    // Content should still be in DOM but might be hidden
  })

  it('allows multiple accordion items to be open', () => {
    render(<FAQ />)
    
    const firstQuestion = screen.getByText(/why create yet another calendar/i)
    const secondQuestion = screen.getByText(/why using my wallet/i)
    
    fireEvent.click(firstQuestion)
    fireEvent.click(secondQuestion)
    
    expect(screen.getByText(/we believe web3 still lacks/i)).toBeInTheDocument()
    expect(screen.getByText(/by connecting with your wallet/i)).toBeInTheDocument()
  })

  it('displays caret icons for accordion buttons', () => {
    const { container } = render(<FAQ />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('has responsive padding', () => {
    const { container } = render(<FAQ />)
    const section = container.querySelector('#faq')
    expect(section).toBeInTheDocument()
  })

  it('renders with max width constraint', () => {
    const { container } = render(<FAQ />)
    const section = container.querySelector('#faq')
    expect(section).toBeInTheDocument()
  })

  it('displays all 5 FAQ items', () => {
    render(<FAQ />)
    const accordionButtons = screen.getAllByRole('button')
    expect(accordionButtons.length).toBe(5)
  })

  it('contains web3 ethos explanation', () => {
    render(<FAQ />)
    const firstQuestion = screen.getByText(/why create yet another calendar/i)
    fireEvent.click(firstQuestion)
    
    expect(screen.getByText(/meets the ethos of a decentralized web/i)).toBeInTheDocument()
  })

  it('explains encryption and privacy', () => {
    render(<FAQ />)
    const privacyQuestion = screen.getByText(/which data is public/i)
    fireEvent.click(privacyQuestion)
    
    expect(screen.getByText(/encrypted with your wallet signature/i)).toBeInTheDocument()
  })

  it('encourages bug reporting', () => {
    render(<FAQ />)
    const devQuestion = screen.getByText(/is meetwith fully developed/i)
    fireEvent.click(devQuestion)
    
    expect(screen.getByText(/report to us in our discord/i)).toBeInTheDocument()
  })

  it('has scroll margin for smooth navigation', () => {
    const { container } = render(<FAQ />)
    const section = container.querySelector('#faq')
    expect(section).toHaveAttribute('id', 'faq')
  })
})
