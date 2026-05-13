import type { NextApiRequest, NextApiResponse } from 'next'

import { DEFAULT_LOCALE, normalizeLocale } from '@/i18n'

type TranslateRequest = {
  locale?: string
  texts?: string[]
}

type TranslateResponse = {
  translations: Record<string, string>
}

const MAX_TEXTS_PER_REQUEST = 100
const MAX_TEXT_LENGTH = 4000
const cache = new Map<string, string>()

const shouldTranslate = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (!normalized) return false
  if (!/[A-Za-z]/.test(normalized)) return false
  if (/^https?:\/\//.test(normalized) || /^mailto:/.test(normalized)) {
    return false
  }

  return true
}

const translateText = async (text: string, targetLocale: string) => {
  const cacheKey = `${targetLocale}:${text}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', DEFAULT_LOCALE)
  url.searchParams.set('tl', targetLocale)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  const response = await fetch(url.toString())

  if (!response.ok) return text

  const data = (await response.json()) as unknown
  const translated = Array.isArray(data)
    ? (data[0] as unknown[])
        ?.map(part => (Array.isArray(part) ? part[0] : ''))
        .join('')
    : undefined

  const result =
    typeof translated === 'string' && translated ? translated : text
  cache.set(cacheKey, result)
  return result
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<TranslateResponse | { error: string }>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as TranslateRequest
  const locale = normalizeLocale(body.locale)

  if (locale === DEFAULT_LOCALE)
    return res.status(200).json({ translations: {} })

  const texts = Array.from(
    new Set(
      (body.texts ?? [])
        .map(text => text.replace(/\s+/g, ' ').trim())
        .filter(text => text.length <= MAX_TEXT_LENGTH && shouldTranslate(text))
    )
  ).slice(0, MAX_TEXTS_PER_REQUEST)

  const entries = await Promise.all(
    texts.map(async text => [text, await translateText(text, locale)] as const)
  )

  return res.status(200).json({ translations: Object.fromEntries(entries) })
}

export default handler
