import { NextApiRequest, NextApiResponse } from 'next';
import { getAccountFromDB } from '../../../utils/database';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { address } = req.query;

    try {
      const account = await getAccountFromDB(address as string);
      res.status(200).json(account);
    } catch (e) {
      console.log(e);
      res.status(404).send('Not found');
    }
  }
};
