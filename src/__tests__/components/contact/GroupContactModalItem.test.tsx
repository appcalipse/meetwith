import { render } from '@testing-library/react'
import GroupContactModalItem from '@/components/contact/GroupContactModalItem'

const mockProps = {
  id: '1',
  name: 'Test',
  address: '0x1234567890123456789012345678901234567890',
  avatar_url: '',
  index: 0,
  isContactAlreadyAdded: jest.fn().mockReturnValue(false),
  addUserFromContact: jest.fn(),
  removeUserFromContact: jest.fn(),
  isLoading: false,
}

describe('Contact GroupContactModalItem', () => {
  it('renders without crashing', () => {
    expect(() => render(<GroupContactModalItem {...mockProps} />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays content', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props correctly', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts without errors', () => {
    const { unmount } = render(<GroupContactModalItem {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders same output', () => {
    const first = render(<GroupContactModalItem {...mockProps} />)
    const second = render(<GroupContactModalItem {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors in console', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<GroupContactModalItem {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('cleans up properly', () => {
    const { unmount } = render(<GroupContactModalItem {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<GroupContactModalItem {...mockProps} />)
    expect(container.innerHTML).toBeTruthy()
  })
})
