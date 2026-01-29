import { render } from '@testing-library/react'
import { NextPageContext } from 'next'
import Dashboard from '../index'
import redirectTo from '@/utils/redirect'

jest.mock('@/session/forceAuthenticationCheck', () => ({
  forceAuthenticationCheck: (component: any) => component,
}))

jest.mock('@/session/requireAuthentication', () => ({
  withLoginRedirect: (component: any) => {
    component.getInitialProps = Dashboard.getInitialProps
    return component
  },
}))

jest.mock('@/utils/redirect')

describe('Dashboard Index Page', () => {
  it('should render empty component', () => {
    const { container } = render(<Dashboard />)
    expect(container.firstChild).toBeNull()
  })

  it('should redirect to meetings page in getInitialProps', async () => {
    const ctx = {} as NextPageContext
    const mockRedirectTo = redirectTo as jest.MockedFunction<typeof redirectTo>
    mockRedirectTo.mockResolvedValue({})

    await Dashboard.getInitialProps?.(ctx)

    expect(redirectTo).toHaveBeenCalledWith('/dashboard/MEETINGS', 302, ctx)
  })

  it('should handle getInitialProps with different contexts', async () => {
    const contexts = [
      { req: {}, res: {} },
      { pathname: '/dashboard' },
      { query: { test: 'value' } },
    ]

    for (const ctx of contexts) {
      await Dashboard.getInitialProps?.(ctx as any)
      expect(redirectTo).toHaveBeenCalled()
    }
  })
})
