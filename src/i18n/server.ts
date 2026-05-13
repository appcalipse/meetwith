import type { NextApiRequest, NextApiResponse } from 'next'

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
  type TranslationKey,
  type TranslationParams,
  translate,
} from '@/i18n'

type LocalizedErrorBody = {
  error: string
  code?: string
}

export const getLocaleFromRequest = (
  req: Pick<NextApiRequest, 'headers' | 'query'>
): SupportedLocale => {
  const queryLocale = Array.isArray(req.query?.locale)
    ? req.query.locale[0]
    : req.query?.locale
  const headerLocale = req.headers['x-locale'] ?? req.headers['accept-language']
  const locale = Array.isArray(headerLocale) ? headerLocale[0] : headerLocale

  return normalizeLocale(queryLocale ?? locale ?? DEFAULT_LOCALE)
}

export const tApi = (
  req: Pick<NextApiRequest, 'headers' | 'query'>,
  key: TranslationKey,
  params?: TranslationParams
): string => translate(getLocaleFromRequest(req), key, params)

export const localizedErrorBody = (
  req: Pick<NextApiRequest, 'headers' | 'query'>,
  key: TranslationKey,
  params?: TranslationParams,
  code?: string
): LocalizedErrorBody => ({
  code,
  error: tApi(req, key, params),
})

export const sendLocalizedError = (
  req: NextApiRequest,
  res: NextApiResponse,
  status: number,
  key: TranslationKey,
  params?: TranslationParams,
  code?: string
) => res.status(status).json(localizedErrorBody(req, key, params, code))

export const sendLocalizedText = (
  req: NextApiRequest,
  res: NextApiResponse,
  status: number,
  key: TranslationKey,
  params?: TranslationParams
) => res.status(status).send(tApi(req, key, params))

export const sendNotFound = (req: NextApiRequest, res: NextApiResponse) =>
  sendLocalizedText(req, res, 404, 'api.error.notFound')

export const sendMethodNotAllowed = (
  req: NextApiRequest,
  res: NextApiResponse
) => sendLocalizedText(req, res, 405, 'api.error.methodNotAllowed')
