import { updatePreferenceAvatar } from '@utils/database'
import { handlerReqWithFile, withFileUpload } from '@utils/uploads'
import { NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

export const config = {
  api: {
    bodyParser: false,
  },
}

const handler = async (req: handlerReqWithFile, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { avatar } = req.body?.files
    if (!avatar) {
      return res.status(400).json({ error: 'File is required' })
    }
    const { filename, buffer } = avatar

    const userAvatar = await updatePreferenceAvatar(
      req.session.account!.address,
      filename,
      buffer
    )
    if (!userAvatar) {
      return res.status(500).json({ error: 'Failed to update avatar' })
    }
    return res.status(200).json(userAvatar)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(withFileUpload(handler))
