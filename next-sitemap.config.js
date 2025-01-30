/** @type {import('next-sitemap').IConfig} */
// Check options to change config in https://www.npmjs.com/package/next-sitemap
const config = {
  siteUrl: process.env.NEXT_PUBLIC_HOSTED_AT || 'https://meetwith.xyz',
  generateRobotsTxt: true,

  // ...other options
}

module.exports = config
