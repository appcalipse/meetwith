import slugify from 'slugify'

export const generateTwitterUrl = (url: string) => {
  if (url.startsWith('@')) {
    return `https://twitter.com/${url.replace('@', '')}`
  } else if (url.startsWith('http')) {
    return url
  } else if (url.startsWith('twitter.com')) {
    ;`https://${url}`
  } else {
    return `https://twitter.com/${url}`
  }
}

export const generateTelegramUrl = (url: string) => {
  if (url.startsWith('@')) {
    return `https://t.me/${url.replace('@', '')}`
  } else if (url.startsWith('http')) {
    return url
  } else if (url.startsWith('t.me')) {
    ;`https://${url}`
  } else {
    return `https://t.me/${url}`
  }
}

export const getSlugFromText = (text: string) =>
  slugify(text, {
    lower: true,
    strict: true,
  })
