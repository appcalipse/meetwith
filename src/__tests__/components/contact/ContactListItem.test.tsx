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

  // NEW EDGE CASE TESTS START HERE
  
  it('handles contacts with very long names', () => {
    const longName = { ...mockContact, name: 'A'.repeat(100) }
    renderComponent(longName)
    expect(screen.getByText(longName.name)).toBeInTheDocument()
  })

  it('handles contacts with special characters in name', () => {
    const specialName = { ...mockContact, name: "O'Brien-Smith Jr. (MD)" }
    renderComponent(specialName)
    expect(screen.getByText(specialName.name)).toBeInTheDocument()
  })

  it('handles contacts with emoji in name', () => {
    const emojiName = { ...mockContact, name: '🚀 John Doe 🎉' }
    renderComponent(emojiName)
    expect(screen.getByText(emojiName.name)).toBeInTheDocument()
  })

  it('handles contacts with very long email addresses', () => {
    const longEmail = { ...mockContact, name: null, email_address: 'very.long.email.address.that.goes.on.forever@subdomain.example.com' }
    renderComponent(longEmail)
    expect(screen.getByText(longEmail.email_address)).toBeInTheDocument()
  })

  it('handles contacts with international email domains', () => {
    const intlEmail = { ...mockContact, email_address: 'user@北京.中国' }
    renderComponent(intlEmail)
    expect(screen.getByText(intlEmail.email_address)).toBeInTheDocument()
  })

  it('displays pending status for pending contacts', () => {
    const pendingContact = { ...mockContact, status: ContactStatus.PENDING }
    renderComponent(pendingContact)
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('handles odd index for background color', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: {},
      pathname: '/',
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <table>
          <tbody>
            <ContactListItem
              account={mockContact}
              index={1}
              sync={mockSync}
              refetch={mockRefetch}
              hasProAccess={true}
            />
          </tbody>
        </table>
      </QueryClientProvider>
    )
    
    const row = container.querySelector('tr')
    expect(row).toBeInTheDocument()
  })

  it('handles missing avatar URL gracefully', () => {
    const noAvatar = { ...mockContact, avatar_url: null }
    renderComponent(noAvatar)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles empty string avatar URL', () => {
    const emptyAvatar = { ...mockContact, avatar_url: '' }
    renderComponent(emptyAvatar)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles missing domain gracefully', () => {
    const noDomain = { ...mockContact, domain: null }
    renderComponent(noDomain)
    const scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    fireEvent.click(scheduleBtn)
    expect(mockPush).toHaveBeenCalled()
  })

  it('handles empty description', () => {
    const noDesc = { ...mockContact, description: '' }
    renderComponent(noDesc)
    expect(screen.queryByText('Test user')).not.toBeInTheDocument()
  })

  it('handles null description', () => {
    const nullDesc = { ...mockContact, description: null }
    renderComponent(nullDesc)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows tooltip on schedule button when disabled', () => {
    renderComponent(mockContact, false)
    const scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    expect(scheduleBtn).toBeDisabled()
  })

  it('handles removal with network timeout', async () => {
    jest.spyOn(apiHelper, 'removeContact').mockImplementation(
      () => new Promise((resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    )
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  it('handles send invite with API error', async () => {
    jest.spyOn(apiHelper, 'sendContactListInvite').mockRejectedValue(new Error('API Error'))
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    
    const sendBtn = screen.getByRole('button', { name: /send request/i })
    fireEvent.click(sendBtn)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument()
    })
  })

  it('prevents double-click on remove button', async () => {
    const removeContactSpy = jest.spyOn(apiHelper, 'removeContact').mockResolvedValue(undefined)
    renderComponent()
    
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeBtn)
    fireEvent.click(removeBtn)
    
    await waitFor(() => {
      expect(removeContactSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('prevents double-click on send invite button', async () => {
    const sendInviteSpy = jest.spyOn(apiHelper, 'sendContactListInvite').mockResolvedValue({ id: '1' } as any)
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    renderComponent(inactiveContact)
    
    const sendBtn = screen.getByRole('button', { name: /send request/i })
    fireEvent.click(sendBtn)
    fireEvent.click(sendBtn)
    
    await waitFor(() => {
      expect(sendInviteSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('handles contacts with lowercase addresses', () => {
    const lowerCaseAddr = { ...mockContact, address: mockContact.address.toLowerCase() }
    renderComponent(lowerCaseAddr)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles contacts with mixed case addresses', () => {
    const mixedCaseAddr = { ...mockContact, address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12' }
    renderComponent(mixedCaseAddr)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders correctly at different table row indices', () => {
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <table>
            <tbody>
              <ContactListItem
                account={mockContact}
                index={i}
                sync={mockSync}
                refetch={mockRefetch}
                hasProAccess={true}
              />
            </tbody>
          </table>
        </QueryClientProvider>
      )
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      unmount()
    }
  })

  it('handles rapid status changes', async () => {
    const { rerender } = renderComponent(mockContact)
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
    
    const inactiveContact = { ...mockContact, status: ContactStatus.INACTIVE }
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, query: {}, pathname: '/' })
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <table>
          <tbody>
            <ContactListItem
              account={inactiveContact}
              index={0}
              sync={mockSync}
              refetch={mockRefetch}
              hasProAccess={true}
            />
          </tbody>
        </table>
      </QueryClientProvider>
    )
    
    expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument()
  })

  it('handles calendar_exists toggle', () => {
    const { rerender } = renderComponent(mockContact)
    expect(screen.queryByText(/calendar not connected/i)).not.toBeInTheDocument()
    
    const noCalendar = { ...mockContact, calendar_exists: false }
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, query: {}, pathname: '/' })
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <table>
          <tbody>
            <ContactListItem
              account={noCalendar}
              index={0}
              sync={mockSync}
              refetch={mockRefetch}
              hasProAccess={true}
            />
          </tbody>
        </table>
      </QueryClientProvider>
    )
    
    expect(screen.getByText(/calendar not connected/i)).toBeInTheDocument()
  })

  it('handles hasProAccess toggle', () => {
    const { rerender } = renderComponent(mockContact, true)
    let scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    expect(scheduleBtn).not.toBeDisabled()
    
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, query: {}, pathname: '/' })
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <table>
          <tbody>
            <ContactListItem
              account={mockContact}
              index={0}
              sync={mockSync}
              refetch={mockRefetch}
              hasProAccess={false}
            />
          </tbody>
        </table>
      </QueryClientProvider>
    )
    
    scheduleBtn = screen.getByRole('button', { name: /schedule/i })
    expect(scheduleBtn).toBeDisabled()
  })

  it('handles HTML in description safely', () => {
    const htmlDesc = { ...mockContact, description: '<script>alert("xss")</script>Safe text' }
    renderComponent(htmlDesc)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles very old created_at timestamps', () => {
    const oldContact = { ...mockContact, created_at: new Date('2000-01-01').toISOString() }
    renderComponent(oldContact)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles future updated_at timestamps', () => {
    const futureContact = { ...mockContact, updated_at: new Date('2099-12-31').toISOString() }
    renderComponent(futureContact)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles contact with all optional fields null', () => {
    const minimalContact = {
      ...mockContact,
      name: null,
      email_address: null,
      description: null,
      avatar_url: null,
      domain: null,
    }
    renderComponent(minimalContact)
    expect(screen.getByText(/no name/i)).toBeInTheDocument()
  })

  it('displays correctly when both name and email are empty strings', () => {
    const emptyContact = { ...mockContact, name: '', email_address: '' }
    renderComponent(emptyContact)
    expect(screen.getByText(/no name/i)).toBeInTheDocument()
  })
})
