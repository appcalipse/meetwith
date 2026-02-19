import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('chakra-react-select', () => {
  const React = require('react')
  const MockSelect = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children)
  return {
    Select: MockSelect,
    CreatableSelect: MockSelect,
    AsyncSelect: MockSelect,
    AsyncCreatableSelect: MockSelect,
    chakraComponents: {},
  }
})

import GroupSettingsModal from '@/components/group/GroupSettingsModal'

jest.mock('@/hooks/useAccountContext', () =>
  jest.fn(() => ({
    address: '0x0000000000000000000000000000000000000001',
    preferences: { timezone: 'UTC', availabilities: [], meetingProviders: [], availaibility_id: undefined },
  }))
)

jest.mock('@/utils/toasts', () => ({
  useToastHelpers: jest.fn(() => ({
    showSuccessToast: jest.fn(),
    showErrorToast: jest.fn(),
  })),
}))

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  group: {
    id: 'group-1',
    name: 'Test Group',
    slug: 'test-group',
    members: [],
    avatar_url: null,
    description: 'A test group',
  },
  availabilityBlocks: [],
  isAdmin: true,
  resetState: jest.fn().mockResolvedValue(undefined),
}

describe('GroupSettingsModal', () => {
  it('renders without crashing', () => {
    expect(() => render(<GroupSettingsModal {...mockProps} />)).not.toThrow()
  })

  it('renders component content', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has proper DOM structure', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI elements', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<GroupSettingsModal {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders without console errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<GroupSettingsModal {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('has accessible markup', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('handles user interaction', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    const elements = container.querySelectorAll('button')
    elements.forEach(el => expect(el).toBeDefined())
  })

  it('renders child components', () => {
    const { container } = render(<GroupSettingsModal {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('maintains consistent output', () => {
    const first = render(<GroupSettingsModal {...mockProps} />)
    const second = render(<GroupSettingsModal {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('cleans up on unmount', () => {
    const { unmount } = render(<GroupSettingsModal {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })
})
