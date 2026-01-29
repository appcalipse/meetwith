import { render } from '@testing-library/react'
import React from 'react'
import HeadMeta from '@/components/public-meeting/HeadMeta'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('@/components/Head', () => ({
  Head: ({ title, description, url, ogImage }: any) => (
    <div data-testid="head-meta">
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
    </div>
  ),
}))

const mockAccount = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'John Doe',
  preferences: {
    description: 'Expert consultant and advisor',
  },
}

const mockTeamMeetingRequest = {
  title: 'Team Standup Meeting',
  description: 'Weekly team sync',
}

describe('HeadMeta', () => {
  it('renders HeadMeta component', () => {
    const { container } = render(<HeadMeta url="https://meetwith.com/user" />)
    expect(container.querySelector('[data-testid="head-meta"]')).toBeInTheDocument()
  })

  it('displays account name in title when account provided', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('John Doe')
  })

  it('includes calendar text in title', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('calendar on Meetwith')
  })

  it('includes web3 style in title', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('#web3 style')
  })

  it('uses account description as meta description', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toBe('Expert consultant and advisor')
  })

  it('uses team meeting title when no account', () => {
    const { container } = render(
      <HeadMeta teamMeetingRequest={mockTeamMeetingRequest as any} url="https://meetwith.com/meeting" />
    )
    const title = container.querySelector('title')
    expect(title?.textContent).toBe('Team Standup Meeting')
  })

  it('uses default title when no account or team meeting', () => {
    const { container } = render(<HeadMeta url="https://meetwith.com" />)
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('Meetwith')
    expect(title?.textContent).toContain('#web3 style')
  })

  it('uses default description when account has no preferences', () => {
    const accountNoDesc = { ...mockAccount, preferences: {} }
    const { container } = render(<HeadMeta account={accountNoDesc as any} url="https://meetwith.com/user" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toContain('Schedule a meeting')
    expect(description?.getAttribute('content')).toContain('web3 wallet')
  })

  it('generates OG image URL with account identifier', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const ogImage = container.querySelector('meta[property="og:image"]')
    expect(ogImage?.getAttribute('content')).toContain(mockAccount.address)
  })

  it('includes encoded URL in OG image params', () => {
    const url = 'https://meetwith.com/user?ref=social'
    const { container } = render(<HeadMeta account={mockAccount as any} url={url} />)
    const ogImage = container.querySelector('meta[property="og:image"]')
    expect(ogImage?.getAttribute('content')).toContain('params=')
  })

  it('sets OG URL meta tag', () => {
    const url = 'https://meetwith.com/johndoe'
    const { container } = render(<HeadMeta account={mockAccount as any} url={url} />)
    const ogUrl = container.querySelector('meta[property="og:url"]')
    expect(ogUrl?.getAttribute('content')).toBe(url)
  })

  it('handles account with no name', () => {
    const noNameAccount = { ...mockAccount, name: null }
    const { container } = render(<HeadMeta account={noNameAccount as any} url="https://meetwith.com/user" />)
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('calendar on Meetwith')
  })

  it('handles account with empty preferences', () => {
    const emptyPrefAccount = { ...mockAccount, preferences: null }
    const { container } = render(<HeadMeta account={emptyPrefAccount as any} url="https://meetwith.com/user" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toContain('Schedule a meeting')
  })

  it('handles long account descriptions', () => {
    const longDescAccount = {
      ...mockAccount,
      preferences: { description: 'A'.repeat(500) },
    }
    const { container } = render(<HeadMeta account={longDescAccount as any} url="https://meetwith.com/user" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toBe('A'.repeat(500))
  })

  it('handles special characters in URL', () => {
    const specialUrl = 'https://meetwith.com/user?name=John&utm_source=twitter'
    const { container } = render(<HeadMeta account={mockAccount as any} url={specialUrl} />)
    const ogUrl = container.querySelector('meta[property="og:url"]')
    expect(ogUrl?.getAttribute('content')).toBe(specialUrl)
  })

  it('includes apiUrl in OG image', () => {
    const { container } = render(<HeadMeta account={mockAccount as any} url="https://meetwith.com/user" />)
    const ogImage = container.querySelector('meta[property="og:image"]')
    expect(ogImage?.getAttribute('content')).toContain('/accounts/social/og/')
  })

  it('handles team meeting without title', () => {
    const noTitleMeeting = { ...mockTeamMeetingRequest, title: null }
    const { container } = render(
      <HeadMeta teamMeetingRequest={noTitleMeeting as any} url="https://meetwith.com/meeting" />
    )
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('Meetwith')
  })

  it('prioritizes account over team meeting for title', () => {
    const { container } = render(
      <HeadMeta
        account={mockAccount as any}
        teamMeetingRequest={mockTeamMeetingRequest as any}
        url="https://meetwith.com/user"
      />
    )
    const title = container.querySelector('title')
    expect(title?.textContent).toContain('John Doe')
    expect(title?.textContent).not.toContain('Team Standup')
  })

  it('mentions email scheduling in default description', () => {
    const { container } = render(<HeadMeta url="https://meetwith.com" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toContain('email')
  })

  it('mentions guest scheduling in default description', () => {
    const { container } = render(<HeadMeta url="https://meetwith.com" />)
    const description = container.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toContain('guest')
  })
})
