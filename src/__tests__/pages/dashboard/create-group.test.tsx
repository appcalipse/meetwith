import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useToast } from '@chakra-ui/react'
import CreateGroupPage from '../create-group'
import { createGroup } from '@/utils/api_helper'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: jest.fn(),
}))

jest.mock('@/utils/api_helper', () => ({
  createGroup: jest.fn(),
}))

describe('CreateGroupPage', () => {
  const mockPush = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useToast as jest.Mock).mockReturnValue(mockToast)
  })

  it('should render create group form', () => {
    render(<CreateGroupPage />)

    expect(screen.getByText('Set up your Group')).toBeInTheDocument()
    expect(screen.getByText('Group name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('My Group Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('should render back link', () => {
    render(<CreateGroupPage />)
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('should update group name on input change', () => {
    render(<CreateGroupPage />)
    const input = screen.getByPlaceholderText('My Group Name') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'New Group' } })

    expect(input.value).toBe('New Group')
  })

  it('should create group successfully and redirect', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockResolvedValue({ id: 'new-group-id' } as any)

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Test Group' } })

    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith('Test Group')
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/dashboard/invite-users',
        query: {
          groupId: 'new-group-id',
          groupName: 'Test Group',
        },
      })
    })
  })

  it('should handle form submission', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockResolvedValue({ id: 'group-123' } as any)

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    const form = input.closest('form')!

    fireEvent.change(input, { target: { value: 'My Group' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith('My Group')
    })
  })

  it('should show error toast on API failure', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockRejectedValue(new Error('Failed to create group'))

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Test Group' } })

    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          title: 'Error',
          description: 'Failed to create group',
        })
      )
    })
  })

  it('should handle JSON error message', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    const errorJson = JSON.stringify({ error: 'Group name already exists' })
    mockCreateGroup.mockRejectedValue(new Error(errorJson))

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Duplicate' } })

    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Group name already exists',
        })
      )
    })
  })

  it('should handle non-Error exception', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockRejectedValue('String error')

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Test' } })

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'String error',
        })
      )
    })
  })

  it('should show loading state during submission', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ id: 'test' } as any), 100))
    )

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Test' } })

    const button = screen.getByRole('button', { name: /create/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveAttribute('data-loading')
    })
  })

  it('should prevent double submission', async () => {
    const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
    mockCreateGroup.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ id: 'test' } as any), 100))
    )

    render(<CreateGroupPage />)

    const input = screen.getByPlaceholderText('My Group Name')
    fireEvent.change(input, { target: { value: 'Test' } })

    const button = screen.getByRole('button', { name: /create/i })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledTimes(1)
    })
  })
})
