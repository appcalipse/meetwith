import { NextApiRequest, NextApiResponse } from 'next';
import { MeetingCreationRequest, MeetingEncrypted } from '../../../types/Meeting';
import { initDB, saveMeeting } from '../../../utils/database';

export default async (req: NextApiRequest, res: NextApiResponse) => {

    if (req.method === 'POST') {
        initDB()

        const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

        const meetingResult: MeetingEncrypted = await saveMeeting(meeting)

        res.status(200).json(meetingResult)
        return
    }

    res.status(404).send('Not found')
}