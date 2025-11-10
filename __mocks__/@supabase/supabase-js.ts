import { jest } from '@jest/globals'

export const mockSupabaseClient = {
  from: jest.fn().mockReturnThis() as any,
  select: jest.fn().mockReturnThis() as any,
  insert: jest.fn().mockReturnThis() as any,
  update: jest.fn().mockReturnThis() as any,
  delete: jest.fn().mockReturnThis() as any,
  upsert: jest.fn().mockReturnThis() as any,
  eq: jest.fn().mockReturnThis() as any,
  neq: jest.fn().mockReturnThis() as any,
  gt: jest.fn().mockReturnThis() as any,
  gte: jest.fn().mockReturnThis() as any,
  lt: jest.fn().mockReturnThis() as any,
  lte: jest.fn().mockReturnThis() as any,
  like: jest.fn().mockReturnThis() as any,
  ilike: jest.fn().mockReturnThis() as any,
  is: jest.fn().mockReturnThis() as any,
  in: jest.fn().mockReturnThis() as any,
  match: jest.fn().mockReturnThis() as any,
  or: jest.fn().mockReturnThis() as any,
  filter: jest.fn().mockReturnThis() as any,
  order: jest.fn().mockReturnThis() as any,
  limit: jest.fn().mockReturnThis() as any,
  offset: jest.fn().mockReturnThis() as any,
  single: jest.fn().mockReturnThis() as any,
  maybeSingle: jest.fn().mockReturnThis() as any,
  storage: {
    from: jest.fn().mockReturnThis() as any,
    upload: jest.fn() as any,
    getPublicUrl: jest.fn() as any,
  },
  rpc: jest.fn().mockReturnThis() as any,
}
export const createClient = jest.fn(() => mockSupabaseClient)

export class SupabaseClient {}
