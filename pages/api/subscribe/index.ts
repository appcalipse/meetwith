import {NextApiRequest, NextApiResponse} from 'next';
import {initDB, saveEmailToDB} from '../../../utils/database';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB();
    const email = req.body.email;

    if (email) {
      const success = await saveEmailToDB(email);
      res.status(200).json({success});
      return;
    }
  }

  res.status(404).send('Not found');
};
