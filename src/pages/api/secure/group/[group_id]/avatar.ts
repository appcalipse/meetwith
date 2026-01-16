import * as Sentry from '@sentry/nextjs'
import { NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { initDB, isGroupAdmin, updateGroupAvatar } from '@/utils/database'
import { NotGroupAdminError, UploadError } from '@/utils/errors'
import { handlerReqWithFile, withFileUpload } from '@/utils/uploads'

export const config = {
  api: {
    bodyParser: false,
  },
}

const handler = async (req: handlerReqWithFile, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      initDB()
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const group_id = req.query.group_id as string
      if (!group_id) {
        return res.status(400).json({ error: 'Group ID is required' })
      }

      // Check if user is admin of the group
      const isAdmin = await isGroupAdmin(group_id, req.session.account.address)
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: 'Only group admins can upload avatars' })
      }

      const { avatar } = req.body?.files
      if (!avatar) {
        return res.status(400).json({ error: 'File is required' })
      }
      const { filename, buffer, mimeType } = avatar

      const groupAvatar = await updateGroupAvatar(
        group_id,
        filename,
        buffer,
        mimeType
      )
      if (!groupAvatar) {
        return res.status(500).json({ error: 'Failed to update avatar' })
      }
      return res.status(200).json(groupAvatar)
    } catch (e) {
      if (e instanceof UploadError) {
        return res.status(400).json({ error: e.message })
      }
      if (e instanceof NotGroupAdminError) {
        return res.status(403).json({ error: e.message })
      }
      Sentry.captureException(e, {
        tags: {
          method: req.method,
          route: 'api/secure/group/[group_id]/avatar',
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
