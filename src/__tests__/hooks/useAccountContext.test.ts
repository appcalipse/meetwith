import { renderHook } from '@testing-library/react'
import { useContext } from 'react'
import useAccountContext from '@/hooks/useAccountContext'
import { AccountContext } from '@/providers/AccountProvider'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}))

describe('useAccountContext', () => {
  const mockUseContext = useContext as jest.MockedFunction<typeof useContext>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return currentAccount from context', () => {
    const mockAccount = { id: '1', name: 'Test Account' }
    mockUseContext.mockReturnValue({ currentAccount: mockAccount })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toEqual(mockAccount)
  })

  it('should return undefined when no account is set', () => {
    mockUseContext.mockReturnValue({ currentAccount: undefined })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toBeUndefined()
  })

  it('should return null when account is null', () => {
    mockUseContext.mockReturnValue({ currentAccount: null })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toBeNull()
  })

  it('should use AccountContext', () => {
    mockUseContext.mockReturnValue({ currentAccount: null })

    renderHook(() => useAccountContext())

    expect(mockUseContext).toHaveBeenCalledWith(AccountContext)
  })

  it('should update when context value changes', () => {
    const account1 = { id: '1', name: 'Account 1' }
    const account2 = { id: '2', name: 'Account 2' }
    
    mockUseContext.mockReturnValue({ currentAccount: account1 })
    const { result, rerender } = renderHook(() => useAccountContext())
    expect(result.current).toEqual(account1)

    mockUseContext.mockReturnValue({ currentAccount: account2 })
    rerender()
    expect(result.current).toEqual(account2)
  })

  it('should handle account with complex structure', () => {
    const complexAccount = {
      id: '123',
      name: 'Complex Account',
      email: 'test@example.com',
      settings: { theme: 'dark', notifications: true },
      metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-02' }
    }
    mockUseContext.mockReturnValue({ currentAccount: complexAccount })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toEqual(complexAccount)
  })

  it('should handle empty object as account', () => {
    mockUseContext.mockReturnValue({ currentAccount: {} })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toEqual({})
  })

  it('should handle account with array properties', () => {
    const accountWithArrays = {
      id: '1',
      roles: ['admin', 'user'],
      permissions: ['read', 'write', 'delete']
    }
    mockUseContext.mockReturnValue({ currentAccount: accountWithArrays })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toEqual(accountWithArrays)
  })

  it('should handle account with nested objects', () => {
    const nestedAccount = {
      id: '1',
      profile: {
        personal: { firstName: 'John', lastName: 'Doe' },
        professional: { title: 'Engineer', company: 'Tech Corp' }
      }
    }
    mockUseContext.mockReturnValue({ currentAccount: nestedAccount })

    const { result } = renderHook(() => useAccountContext())

    expect(result.current).toEqual(nestedAccount)
  })

  it('should handle multiple rapid rerenders', () => {
    const account = { id: '1' }
    mockUseContext.mockReturnValue({ currentAccount: account })

    const { result, rerender } = renderHook(() => useAccountContext())
    
    for (let i = 0; i < 10; i++) {
      rerender()
      expect(result.current).toEqual(account)
    }
  })
})
