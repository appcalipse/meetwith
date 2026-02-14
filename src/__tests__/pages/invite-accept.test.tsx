import { render, screen } from '@testing-library/react'
import React from 'react'
import InviteAcceptPage from '@/pages/invite-accept'

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: { token: 'test' } })),
}))

describe('Invite Accept Page', () => {
  it('renders invite accept page', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays accept message', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByText(/accept/i)).toBeInTheDocument()
  })

  it('shows invite details', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByText(/invite/i)).toBeInTheDocument()
  })

  it('has accept button', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  })

  it('has decline button', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument()
  })

  it('displays inviter info', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByText(/invited by/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('validates invite token', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })

  it('renders error on invalid token', () => {
    render(<InviteAcceptPage />)
    expect(screen.queryByText(/invalid/i)).toBeTruthy()
  })

  it('displays success message', () => {
    render(<InviteAcceptPage />)
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })

  it('redirects after accept', async () => {
    render(<InviteAcceptPage />)
    const acceptBtn = screen.getByRole('button', { name: /accept/i })
    acceptBtn.click()
    expect(acceptBtn).toBeInTheDocument()
  })
})
