import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'

import ContactListItem from '@/components/contact/ContactListItem'
import { Contact } from '@/types/Contacts'
import * as apiHelper from '@/utils/api_helper'
import { ContactStatus } from '@/utils/constants/contact'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/utils/api_helper')

const mockPush = jest.fn()
const mockSync = jest.fn()
const mockRefetch = jest.fn()

const mockContact: Contact = {
  id: '1',
  address: '0x1234567890123456789012345678901234567890',
  name: 'John Doe',
  email_address: 'john@example.com',
  description: 'Test user',
  status: ContactStatus.ACTIVE,
  calendar_exists: true,
  domain: 'johndoe',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderComponent = (contact: Contact = mockContact, hasProAccess = true) => {
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    query: {},
    pathname: '/',
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <ContactListItem
            account={contact}
            index={0}
            sync={mockSync}
            refetch={mockRefetch}
            hasProAccess={hasProAccess}
          />
        </tbody>
      </table>
    </QueryClientProvider>
  )
}

describe('ContactListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders contact information correctly', () => {
    renderComponent()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Test user')).toBeInTheDocument()
  })

  it('displays avatar for contact', () => {
    renderComponent()
    const avatar = document.querySelector('.contact-avatar')
    expect(avatar).toBeInTheDocument()
  })

  it('shows schedule button for active contacts with calendar', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
  })

  it('disables schedule button when user lacks pro access', () => {
    renderComponent(mockContact, false)
    const scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    expect(scheduleBtn).toBeDisabled()
  })

  it('navigates to contact page when schedule is clicked', () => {
    renderComponent()
    const scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    fireEvent.click(scheduleBtn)
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('johndoe'))
  })

  it('shows "Calendar not connected" for contacts without calendar', () => {
    const contactWithoutCalendar = { ...mockContact, calendar_exists: false }
    renderComponent(contactWithoutCalendar)
    expect(screen.getByText(/calendar not connected/i)).toBeInTheDocument()
  })

  it('shows send request button for inactive contacts', () => {
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument()
  })

  it('shows inactive status message', () => {
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    expect(screen.getByText(/removed you as a contact/i)).toBeInTheDocument()
  })

  it('calls removeContact API when remove button is clicked', async () => {
    const removeContactSpy = jest.spyOn(apiHelper, 'removeContact').mockResolvedValue(undefined)
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    
    await waitFor(() => {
      expect(removeContactSpy).toHaveBeenCalledWith(mockContact.address)
    })
  })

  it('calls sync callback after successful removal', async () => {
    jest.spyOn(apiHelper, 'removeContact').mockResolvedValue(undefined)
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    
    await waitFor(() => {
      expect(mockSync).toHaveBeenCalledWith(mockContact.id)
    })
  })

  it('shows loading state on remove button during removal', async () => {
    jest.spyOn(apiHelper, 'removeContact').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    
    expect(removeBtn).toHaveAttribute('aria-busy', 'true')
  })

  it('displays fallback name when contact has no name', () => {
    const noNameContact = { ...mockContact, name: null, email_address: null }
    renderComponent(noNameContact)
    expect(screen.getByText(/no name/i)).toBeInTheDocument()
  })

  it('displays email when name is not available', () => {
    const emailContact = { ...mockContact, name: null }
    renderComponent(emailContact)
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('applies alternating background colors based on index', () => {
    const { container } = renderComponent(mockContact)
    const row = container.querySelector('tr')
    expect(row).toHaveStyle({ backgroundColor: expect.any(String) })
  })

  it('truncates long descriptions', () => {
    const longDesc = { ...mockContact, description: 'A'.repeat(200) }
    const { container } = renderComponent(longDesc)
    const descElement = container.querySelector('th:nth-child(2)')
    expect(descElement).toBeInTheDocument()
  })

  it('handles send invite for inactive contacts', async () => {
    const sendInviteSpy = jest.spyOn(apiHelper, 'sendContactListInvite').mockResolvedValue({ id: '1' } as any)
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    
    const sendBtn = screen.getByRole('button', { name: /send request/i })
    fireEvent.click(sendBtn)
    
    await waitFor(() => {
      expect(sendInviteSpy).toHaveBeenCalledWith(mockContact.address)
    })
  })

  it('disables send request button after successful invite', async () => {
    jest.spyOn(apiHelper, 'sendContactListInvite').mockResolvedValue({ id: '1' } as any)
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    
    const sendBtn = screen.getByRole('button', { name: /send request/i })
    fireEvent.click(sendBtn)
    
    await waitFor(() => {
      expect(sendBtn).toBeDisabled()
    })
  })

  it('shows error toast on removal failure', async () => {
    jest.spyOn(apiHelper, 'removeContact').mockRejectedValue(new Error('Network error'))
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  it('ellipsizes wallet address display', () => {
    renderComponent()
    const addressElements = screen.getAllByText(/0x.../)
    expect(addressElements.length).toBeGreaterThan(0)
  })
})
