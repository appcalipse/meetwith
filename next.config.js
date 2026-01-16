/** @type {import('next').NextConfig} */
/** biome-ignore-all lint/style/noCommonJs: commonjs is the default module type for this config file */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = require('@sentry/nextjs')

// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto')

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

/** @type {import('next').NextConfig} */
const moduleExports = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  compress: true,
  poweredByHeader: false,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  images: {
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ]
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  // compiler: {
  //   removeConsole:
  //     process.env.NODE_ENV === 'production'
  //       ? {
  //           exclude: ['error', 'warn'],
  //         }
  //       : false,
  // },

  webpack: (config, { dev }) => {
    if (!dev) {
      // Split your bundles more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
          lib: {
            test(module) {
              return (
                module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier())
              )
            },
            name(module) {
              const hash = crypto.createHash('sha1')
              if (module.identifier) {
                hash.update(module.identifier())
              }
              return hash.digest('hex').substring(0, 8)
            },
            chunks: 'all',
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          chakra: {
            test: /[\\/]node_modules[\\/](@chakra-ui|@emotion)[\\/]/,
            name: 'chakra-ui',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
        },
      }

      // Production optimizations
      config.optimization.moduleIds = 'deterministic'
      config.optimization.chunkIds = 'deterministic'
    } else {
      config.optimization.splitChunks = {
        chunks: 'async',
        cacheGroups: {
          default: false,
        },
      }
    }

    return config
  },
}

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
module.exports = withMDX(
  withSentryConfig(moduleExports, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: 'appcalipse',
    project: 'meet-with-wallet',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: '/monitoring',

    webpack: {
      treeshake: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        removeDebugLogging: true,
      },
    },
  })
)
