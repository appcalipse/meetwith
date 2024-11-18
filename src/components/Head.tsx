import NextHead from 'next/head'

interface HeadProps {
  url: string
  title: string
  description: string
  ogImage: string
}

const defaultProps: HeadProps = {
  title: 'Group meeting scheduling made easy.',
  description:
    'Meetwith provides an easy way to schedule group meetings while preserving your privacy.',
  url: 'https://meetwith.xyz/',
  ogImage: 'https://meetwith.xyz/assets/opengraph.png',
}

export const Head: React.FC<Partial<HeadProps>> = props => {
  const { title, description, url, ogImage } = { ...defaultProps, ...props }

  return (
    <NextHead>
      <title>{title}</title>
      <meta name="description" content={description} key="description" />
      <meta property="og:url" content={url} key="og:url" />
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:title" content={title} key="og:title" />
      <meta
        property="og:description"
        content={description}
        key="og:description"
      />
      <meta property="og:image" content={ogImage} key="og:image" />
      <meta
        name="twitter:card"
        content="summary_large_image"
        key="twitter:card"
      />
      <meta
        property="twitter:domain"
        content="meetwithwallet.xyz"
        key="twitter:domain"
      />
      <meta property="twitter:url" content={url} key="twitter:url" />
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta
        name="twitter:description"
        content={description}
        key="twitter:description"
      />
      <meta name="twitter:image" content={ogImage} key="twitter:image" />
      <meta
        name="viewport"
        content="initial-scale=1, width=device-width"
        key="viewport"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#f35826" />
      <meta
        name="msapplication-TileColor"
        content="#1a202c"
        key="msapplication-TileColor"
      />
      <meta name="theme-color" content="#f35826" key="theme-color" />
    </NextHead>
  )
}
