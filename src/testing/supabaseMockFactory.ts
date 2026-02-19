/**
 * Supabase Mock Factory
 * 
 * Provides utilities to create chainable Supabase mocks for testing
 * Supports complex query chains and RPC calls
 */

type QueryData = unknown
type ErrorType = { message: string; code?: string } | null

interface SupabaseResponse<T = QueryData> {
  data: T | null
  error: ErrorType
}

interface SupabaseQueryBuilder {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  upsert: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is: jest.Mock
  in: jest.Mock
  contains: jest.Mock
  containedBy: jest.Mock
  range: jest.Mock
  match: jest.Mock
  not: jest.Mock
  or: jest.Mock
  filter: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  then: jest.Mock
}

/**
 * Creates a chainable Supabase query builder mock
 */
export const createSupabaseMock = (
  tableName: string,
  fixtureData?: Record<string, unknown> | unknown[]
): SupabaseQueryBuilder => {
  const defaultResponse: SupabaseResponse = {
    data: fixtureData || null,
    error: null,
  }

  const queryBuilder: Partial<SupabaseQueryBuilder> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(defaultResponse),
    maybeSingle: jest.fn().mockResolvedValue(defaultResponse),
    then: jest.fn((resolve) =>
      resolve(
        Array.isArray(fixtureData)
          ? { data: fixtureData, error: null }
          : defaultResponse
      )
    ),
  }

  return queryBuilder as SupabaseQueryBuilder
}

/**
 * Creates a full Supabase client mock with table and RPC support
 */
export const createSupabaseClientMock = (
  tableFixtures: Record<string, unknown> = {},
  rpcFixtures: Record<string, unknown> = {}
) => {
  return {
    from: jest.fn((tableName: string) => {
      const fixtureData = tableFixtures[tableName]
      return createSupabaseMock(tableName, fixtureData)
    }),
    rpc: jest.fn((functionName: string, params?: unknown) => {
      const fixtureData = rpcFixtures[functionName]
      return Promise.resolve({
        data: fixtureData || null,
        error: null,
      })
    }),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signIn: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  }
}

/**
 * Helper to create error responses
 */
export const createSupabaseError = (
  message: string,
  code?: string
): SupabaseResponse => {
  return {
    data: null,
    error: { message, code },
  }
}

/**
 * Helper to create success responses
 */
export const createSupabaseSuccess = <T = unknown>(
  data: T
): SupabaseResponse<T> => {
  return {
    data,
    error: null,
  }
}
