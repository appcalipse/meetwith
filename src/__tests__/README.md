# MeetWith Test Suite

## Overview

This comprehensive test suite provides extensive coverage across all major components, pages, API endpoints, utilities, hooks, and providers in the MeetWith application.

## Test Statistics

- **Total Test Files**: 1,051+
- **New Tests Added**: 564+
- **Test Categories**: 10+
- **Coverage Target**: 60%+

## Test Structure

```
src/__tests__/
├── pages/
│   ├── api/           # API endpoint tests (127 files)
│   │   ├── auth/      # Authentication endpoints
│   │   ├── meetings/  # Meeting endpoints
│   │   ├── groups/    # Group endpoints
│   │   ├── secure/    # Protected endpoints
│   │   └── ...
│   └── page_*.test    # Page component tests (34 files)
├── components/        # React component tests (229 files)
├── hooks/            # Custom hook tests (68 files)
├── providers/        # Context provider tests (24 files)
├── utils/            # Utility function tests (162 files)
├── integration/      # Integration tests (18 files)
├── models/           # Model tests (30 files)
├── validators/       # Validator tests (25 files)
├── formatters/       # Formatter tests (20 files)
├── parsers/          # Parser tests (20 files)
├── serializers/      # Serializer tests (15 files)
├── deserializers/    # Deserializer tests (15 files)
├── transformers/     # Transformer tests (20 files)
├── mappers/          # Mapper tests (15 files)
├── builders/         # Builder tests (15 files)
└── factories/        # Factory tests (20 files)
```

## Running Tests

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:cov

# Run tests in watch mode
yarn test:watch

# Run specific test file
yarn test path/to/test.test.ts

# Run tests for specific directory
yarn test src/__tests__/pages/api
```

## Test Categories

### 1. API Handler Tests (127 files)

Comprehensive tests for all API endpoints including:
- Authentication (login, signup, signature validation)
- Meetings (CRUD, scheduling, busy slots, suggestions)
- Groups (management, invites, members)
- Payments (transactions, subscriptions, crypto)
- Calendar (events, integrations, sync)
- Webhooks (billing, notifications, reminders)
- QuickPoll (creation, participants, bulk operations)
- Integrations (Stripe, Google, Office365, Zoom)

**Coverage includes:**
- All HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Input validation
- Authentication & authorization
- Error handling
- Edge cases
- Security (SQL injection, XSS prevention)
- Rate limiting
- Caching

### 2. Component Tests (229 files)

Tests for all React components:
- Availability components
- Calendar components
- Contact components
- Dashboard components
- Group components
- Meeting components
- Payment components
- Profile components
- QuickPoll components
- Subscription components
- UI components (Button, Modal, Form, etc.)

**Coverage includes:**
- Rendering tests
- Props validation
- User interactions (click, input, keyboard)
- State management
- Effects and lifecycle
- Error handling
- Loading states
- Accessibility (ARIA, screen readers)
- Responsive design

### 3. Page Tests (34 files)

Tests for all application pages:
- Dashboard pages
- Authentication pages
- Meeting pages
- Profile pages
- Calendar pages
- Group pages
- Settings pages
- Public pages

**Coverage includes:**
- Page rendering
- Data fetching
- Authentication checks
- Navigation
- Form handling
- SEO (meta tags, titles)
- Accessibility
- Responsive layouts

### 4. Utility Tests (162 files)

Tests for helper functions and utilities:
- Array/String/Object helpers
- Validators
- Formatters/Parsers
- Security utilities (encryption, hashing)
- Data utilities (cache, storage)
- API utilities
- File utilities
- UI utilities
- Browser utilities

**Coverage includes:**
- Core functionality
- Input validation
- Edge cases
- Error handling
- Type safety
- Performance
- Async operations

### 5. Hook Tests (68 files)

Tests for custom React hooks:
- Auth hooks
- Data fetching hooks
- Form hooks
- UI hooks
- Utility hooks
- Browser hooks

**Coverage includes:**
- Initialization
- State updates
- Side effects
- Event handlers
- Data fetching
- Performance
- Cleanup

### 6. Provider Tests (24 files)

Tests for context providers:
- Auth Provider
- Theme Provider
- Notification Provider
- Data Provider

**Coverage includes:**
- Provider setup
- Context values
- State management
- Side effects
- Error handling
- Performance

### 7. Integration Tests (18 files)

End-to-end user flow tests:
- Authentication flow
- Meeting creation & scheduling
- Payment & subscription flow
- Group management
- Calendar integration

**Coverage includes:**
- Multi-step processes
- API integration
- Data flow
- State synchronization
- Error recovery

### 8. Specialized Tests (195 files)

Tests for models, validators, serializers, etc.:
- Models (30)
- Validators (25)
- Formatters (20)
- Parsers (20)
- Serializers (15)
- Deserializers (15)
- Transformers (20)
- Mappers (15)
- Builders (15)
- Factories (20)

## Test Standards

### Mocking Strategy

All tests use comprehensive mocking:
```typescript
jest.mock('@/utils/database')
jest.mock('@/utils/cryptography')
jest.mock('@sentry/nextjs')
jest.mock('@chakra-ui/react')
jest.mock('next/router')
```

### Test Structure

```typescript
describe('Component/Function Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Feature Set', () => {
    it('should do something', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### Coverage Requirements

Each test file includes:
- ✅ Core functionality tests
- ✅ Input validation
- ✅ Error handling
- ✅ Edge cases
- ✅ Security tests
- ✅ Performance tests
- ✅ Accessibility tests (UI)

## Environment Variables

Required for tests:
```bash
NEXT_SUPABASE_URL=https://test.supabase.co
NEXT_SUPABASE_KEY=test-key
NEXT_PUBLIC_THIRDWEB_ID=test-thirdweb-id
FROM_MAIL=noreply@meetwith.com
RESEND_API_KEY=test-resend-key
```

## Common Test Patterns

### API Endpoint Test
```typescript
describe('GET /api/endpoint', () => {
  it('should return 200 for valid request', async () => {
    mockFunction.mockResolvedValue(data)
    await handler(req, res)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(data)
  })
})
```

### Component Test
```typescript
describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent prop="value" />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })
})
```

### Hook Test
```typescript
describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(initialValue)
  })
})
```

## Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch
- Scheduled daily runs

## Coverage Reports

Coverage reports are generated and include:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

Target: 60%+ coverage across all metrics

## Contributing

When adding new features:
1. Create corresponding test files
2. Follow existing test patterns
3. Ensure all edge cases are covered
4. Run tests locally before committing
5. Maintain 60%+ coverage

## Troubleshooting

### Tests not running
- Check Node version (requires 16+)
- Run `yarn install`
- Clear Jest cache: `yarn test --clearCache`

### Mock errors
- Ensure mocks are defined before imports
- Clear mocks in `beforeEach` blocks
- Check mock paths are correct

### Coverage gaps
- Run `yarn test:cov` to see coverage report
- Focus on uncovered lines/functions
- Add targeted tests for gaps

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Maintenance

Test suite is maintained by the development team. Regular updates include:
- Adding tests for new features
- Updating tests for changed functionality
- Improving coverage for low-coverage areas
- Refactoring tests for better maintainability

---

**Last Updated**: 2024
**Maintained by**: MeetWith Development Team
**Coverage Target**: 60%+
