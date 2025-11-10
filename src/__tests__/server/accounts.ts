import getAccountUrl from '@/pages/api/accounts/calendar_url/[identifier]'

import { mockSupabaseClient } from '../../../__mocks__/@supabase/supabase-js'
describe('Account endpoint Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAccountUrl', () => {
    describe('should return a response when a valid identifier is passed', () => {
      it('-- Account with PRO subcscription --', async () => {
        const req: any = {
          method: 'GET',
          query: { identifier: 'valid-identifier' },
        }
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
        }
        const account = {
          address: '0x123',
          is_invited: false,
          calendar_token: 'token123',
        }
        mockSupabaseClient.rpc.mockResolvedValue({
          data: [account],
          error: null,
        })

        await getAccountUrl(req, res)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            calendar_url: expect.stringMatching(/\/0x123/),
          })
        )
      })
    })
  })
})
