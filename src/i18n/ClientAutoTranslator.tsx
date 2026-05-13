import { useEffect } from 'react'

import { DEFAULT_LOCALE, translateText } from '@/i18n'
import { useI18n } from '@/i18n/I18nProvider'

const originalTextNodes = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()
const runtimeTranslations = new Map<string, string>()
const pendingRuntimeTranslations = new Set<string>()
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt']
const SKIP_TAGS = new Set([
  'CODE',
  'IFRAME',
  'NOSCRIPT',
  'PRE',
  'SCRIPT',
  'STYLE',
  'SVG',
  'TEXTAREA',
])

const shouldSkipElement = (element: Element | null) => {
  if (!element) return true
  if (SKIP_TAGS.has(element.tagName)) return true
  return !!element.closest('[data-no-translate], code, pre, script, style, svg')
}

const shouldSkipRuntimeTranslation = (value: string) =>
  /^(Meetwith|Google|Zoom|iCloud|Webdav|Office 365|Discord|Telegram|Twitter|ENS|Lens)$/i.test(
    value.trim()
  )

const translatePreservingWhitespace = (locale: string, value: string) => {
  const match = value.match(/^(\s*)(.*?)(\s*)$/s)
  if (!match) return value

  const [, prefix, content, suffix] = match
  if (!content.trim()) return value

  const exactTranslated = translateText(locale, content)
  const runtimeTranslated = runtimeTranslations.get(`${locale}:${content}`)
  const translated = runtimeTranslated ?? exactTranslated
  return `${prefix}${translated}${suffix}`
}

const queueRuntimeTranslation = (locale: string, value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || shouldSkipRuntimeTranslation(normalized)) return

  const exactTranslated = translateText(locale, normalized)
  if (exactTranslated !== normalized) return

  const key = `${locale}:${normalized}`
  if (runtimeTranslations.has(key) || pendingRuntimeTranslations.has(key))
    return

  pendingRuntimeTranslations.add(key)
}

const translateTextNode = (locale: string, node: Text) => {
  if (shouldSkipElement(node.parentElement)) return

  const current = node.nodeValue ?? ''
  const storedOriginal = originalTextNodes.get(node)
  const previousTranslated = storedOriginal
    ? translatePreservingWhitespace(locale, storedOriginal)
    : undefined
  const original =
    storedOriginal &&
    (current === storedOriginal || current === previousTranslated)
      ? storedOriginal
      : current
  originalTextNodes.set(node, original)

  if (locale !== DEFAULT_LOCALE) queueRuntimeTranslation(locale, original)

  const nextValue =
    locale === DEFAULT_LOCALE
      ? original
      : translatePreservingWhitespace(locale, original)

  if (node.nodeValue !== nextValue) node.nodeValue = nextValue
}

const translateElementAttributes = (locale: string, element: Element) => {
  if (shouldSkipElement(element)) return

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute)
    if (!current) continue

    let originals = originalAttributes.get(element)
    if (!originals) {
      originals = new Map()
      originalAttributes.set(element, originals)
    }

    const storedOriginal = originals.get(attribute)
    const previousTranslated = storedOriginal
      ? translatePreservingWhitespace(locale, storedOriginal)
      : undefined
    const original =
      storedOriginal &&
      (current === storedOriginal || current === previousTranslated)
        ? storedOriginal
        : current
    originals.set(attribute, original)

    if (locale !== DEFAULT_LOCALE) queueRuntimeTranslation(locale, original)

    const nextValue =
      locale === DEFAULT_LOCALE
        ? original
        : translatePreservingWhitespace(locale, original)

    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue)
    }
  }
}

const requestRuntimeTranslations = async (
  locale: string,
  onTranslated: () => void
) => {
  const texts = Array.from(pendingRuntimeTranslations)
    .filter(key => key.startsWith(`${locale}:`))
    .map(key => key.slice(locale.length + 1))

  if (texts.length === 0) return

  texts.forEach(text => pendingRuntimeTranslations.delete(`${locale}:${text}`))

  try {
    const response = await fetch('/api/i18n/translate', {
      body: JSON.stringify({ locale, texts }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!response.ok) return

    const body = (await response.json()) as {
      translations?: Record<string, string>
    }

    Object.entries(body.translations ?? {}).forEach(([source, translated]) => {
      runtimeTranslations.set(`${locale}:${source}`, translated)
    })

    onTranslated()
  } catch {
    texts.forEach(text => pendingRuntimeTranslations.add(`${locale}:${text}`))
  }
}

const translateTree = (locale: string, root: ParentNode) => {
  if (root instanceof Element) translateElementAttributes(locale, root)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let textNode = walker.nextNode()

  while (textNode) {
    translateTextNode(locale, textNode as Text)
    textNode = walker.nextNode()
  }

  if (root instanceof Element || root instanceof Document) {
    const elements = root.querySelectorAll?.('*') ?? []
    elements.forEach(element => translateElementAttributes(locale, element))
  }
}

export const ClientAutoTranslator = () => {
  const { locale } = useI18n()

  useEffect(() => {
    if (typeof document === 'undefined') return

    let frame = 0
    let translationTimer = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        translateTree(locale, document.body)
        window.clearTimeout(translationTimer)
        translationTimer = window.setTimeout(() => {
          void requestRuntimeTranslations(locale, run)
        }, 250)
      })
    }

    run()

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Text) translateTextNode(locale, node)
          if (node instanceof Element) translateTree(locale, node)
        })

        if (
          mutation.type === 'characterData' ||
          mutation.type === 'attributes'
        ) {
          run()
        }
      }
    })

    observer.observe(document.body, {
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(translationTimer)
      observer.disconnect()
    }
  }, [locale])

  return null
}
