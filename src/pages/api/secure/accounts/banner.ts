import * as Sentry from '@sentry/nextjs'
import { updatePreferenceBanner } from '@utils/database'
import { UploadError } from '@utils/errors'
import { handlerReqWithFile, withFileUpload } from '@utils/uploads'
import { NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { BannerSetting } from '@/types/Account'

export const config = {
  api: {
    bodyParser: false,
  },
}

const handler = async (req: handlerReqWithFile, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const banner_setting = JSON.parse(
        req.body?.banner_setting || '{}'
      ) as BannerSetting
      const { banner } = req.body?.files
      if (!banner) {
        return res.status(400).json({ error: 'File is required' })
      }
      const { filename, buffer, mimeType } = banner
      const userAvatar = await updatePreferenceBanner(
        req.session.account?.address,
        filename,
        buffer,
        mimeType,
        banner_setting
      )
      if (!userAvatar) {
        return res.status(500).json({ error: 'Failed to update avatar' })
      }
      return res.status(200).json(userAvatar)
    } catch (e) {
      if (e instanceof UploadError) {
        return res.status(400).json({ error: e.message })
      }
      Sentry.captureException(e, {
        tags: {
          method: req.method,
          route: 'api/secure/accounts/avatar',
        },
      })
      return res.status(500).json({
        error:
          'Something went wrong with your avatar upload. Please try again or contact support if the issue persists.',
      })
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(withFileUpload(handler))
