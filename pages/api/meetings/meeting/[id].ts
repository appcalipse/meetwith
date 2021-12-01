import { NextApiRequest, NextApiResponse } from 'next';
import { getMeetingFromDB, initDB } from '../../../../utils/database';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB();

    if (!req.query.id) {
      return res.status(404);
    }
    const meeting = await getMeetingFromDB(
      req.query.id as string,
      req.headers.account_address as string
    );

    res.status(200).json(meeting);
    return;
  }
  res.status(404).send('Not found');
};
