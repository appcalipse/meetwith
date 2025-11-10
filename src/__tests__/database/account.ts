import { createClient } from '@supabase/supabase-js'

import { mockSupabaseClient } from '../../../__mocks__/@supabase/supabase-js'
describe('Database Tests', () => {
  let supabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    supabaseClient = createClient('test', 'test-key')
  })

  it('should work', async () => {
    mockSupabaseClient.select.mockResolvedValue({
      data: [{ id: 1 }],
      error: null,
    })

    const result = await supabaseClient.from('users').select('*')

    expect(result.data).toEqual([{ id: 1 }])
    expect(supabaseClient.from).toHaveBeenCalledWith('users')
  })
  it('can verify createClient was called', () => {
    expect(supabaseClient).toBe(mockSupabaseClient)
  })
})
