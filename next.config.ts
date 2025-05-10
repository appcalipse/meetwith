/** @type {import('next').NextConfig} */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = require('@sentry/nextjs')

// https://nextjs.org/docs/advanced-features/using-mdx
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
    // If you use `MDXProvider`, uncomment the following line.
    providerImportSource: '@mdx-js/react',
  },
})

/** @type {import('@sentry/nextjs/types/config/types').ExportedNextConfig} */
const moduleExports = {
  reactStrictMode: true,
  eslint: { dirs: ['src'] },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
}

const SentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // Suppresses all logs
  enabled:
    process.env.NEXT_PUBLIC_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENV === 'production',
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
}

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
module.exports = withMDX(
  withSentryConfig(moduleExports, SentryWebpackPluginOptions, {
    hideSourceMaps: true,
    autoInstrumentServerFunctions: true,
  })
)
