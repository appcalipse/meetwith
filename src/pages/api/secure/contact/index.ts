import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { Contact, LeanContact } from '@/types/Contacts'
import {
  countContactsAddedThisMonth,
  getContactLean,
  getContacts,
  initDB,
  isProAccountAsync,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      if (req.query.metadata === 'true') {
        const isPro = await isProAccountAsync(account_address)
        const contactsAddedThisMonth = await countContactsAddedThisMonth(
          account_address
        )
        const upgradeRequired = !isPro && contactsAddedThisMonth >= 3

        return res.status(200).json({
          upgradeRequired,
          contactsAddedThisMonth,
          limit: 3,
        })
      }

      const type = req.query.type as 'lean' | undefined
      const dbResults = await (type === 'lean'
        ? getContactLean(
            account_address,
            req.query.q as string,
            req.query.limit ? Number(req.query.limit as string) : undefined,
            req.query.offset ? Number(req.query.offset as string) : undefined
          )
        : getContacts(
            account_address,
            req.query.q as string,
            req.query.limit ? Number(req.query.limit as string) : undefined,
            req.query.offset ? Number(req.query.offset as string) : undefined
          ))
      let results: Array<Contact | LeanContact> = dbResults.result || []
      const inDependentSet = new Set<string>()

      for (const contact of results) {
        inDependentSet.add(contact.address)
      }
      results = results
        .map(contact => {
          if (inDependentSet.has(contact.address)) {
            inDependentSet.delete(contact.address)
            return contact
          }
        })
        .filter((contact): contact is Contact | LeanContact => Boolean(contact))

      return res.status(200).json(results)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
