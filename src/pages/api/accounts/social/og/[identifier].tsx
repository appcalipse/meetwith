import { Resvg } from '@resvg/resvg-js'
import * as fs from 'fs'
import { NextApiRequest, NextApiResponse } from 'next'
import { join } from 'path'
import satori from 'satori'
import sharp from 'sharp'

import UserBanner from '@/components/og-images/Banner'
import { BannerSetting } from '@/types/Account'
import { appUrl } from '@/utils/constants'
import {
  getAccountPreferencesLean,
  getOwnerPublicUrlServer,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const dmSansMediumData = fs.readFileSync(
  join(process.cwd(), 'public', 'fonts', 'DMSans', 'DMSans-Medium.ttf')
)
const dmSansBoldData = fs.readFileSync(
  join(process.cwd(), 'public', 'fonts', 'DMSans', 'DMSans-Bold.ttf')
)
const getUrlFromParams = (params: string) => {
  const paths = params.split('/')
  const pathname = paths.slice(1).join('/')
  return `${appUrl}/${pathname}`
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const account_address = extractQuery(req.query, 'identifier')
  const params = extractQuery(req.query, 'params')
  // eslint-disable-next-line no-restricted-syntax
  try {
    if (!account_address) {
      // fallback to default og image
      throw new Error('No account address')
    }

    const promises = [
      getAccountPreferencesLean(account_address),
      params
        ? getUrlFromParams(params)
        : getOwnerPublicUrlServer(account_address),
    ] as [
      ReturnType<typeof getAccountPreferencesLean>,
      ReturnType<typeof getOwnerPublicUrlServer>,
    ]
    const [user_preferences, calendar_url] = await Promise.all(promises)

    if (!user_preferences) {
      // fallback to default og image
      throw new Error('No account address')
    }
    let avatar_url = null

    if (user_preferences.avatar_url) {
      const avatarBuffer = await fetch(user_preferences.avatar_url).then(res =>
        res.arrayBuffer()
      )

      const avatarPngBuffer = await sharp(Buffer.from(avatarBuffer))
        .toFormat('png') // Force conversion to PNG
        .resize(300, 300, {
          fit: 'cover',
          kernel: sharp.kernel.lanczos3,
        })
        .toBuffer()

      avatar_url = `data:image/png;base64,${avatarPngBuffer.toString('base64')}`
    }

    const svg = await satori(
      <UserBanner
        avatar_url={avatar_url}
        banner_setting={
          (user_preferences.banner_setting || {
            show_avatar: true,
            show_description: true,
          }) as BannerSetting
        }
        banner_url={user_preferences.banner_url}
        calendar_url={calendar_url}
        description={user_preferences.description}
        name={user_preferences.name}
        owner_account_address={user_preferences.owner_account_address}
      />,
      {
        fonts: [
          {
            data: dmSansMediumData,
            name: 'DM Sans',
            style: 'normal',
            weight: 500,
          },
          {
            data: dmSansBoldData,
            name: 'DM Sans',
            style: 'normal',
            weight: 700,
          },
        ],
        height: 630,
        width: 1200,
      }
    )

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    const pngBuffer = resvg.render().asPng()
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    res.status(200).send(pngBuffer)
  } catch (e) {
    console.error(e)
    const ogBuffer = await fetch(
      'https://meetwith.xyz/assets/opengraph.png'
    ).then(res => res.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    res.status(200).send(Buffer.from(ogBuffer))
  } finally {
    // eslint-disable-next-line no-restricted-syntax
  }
}
