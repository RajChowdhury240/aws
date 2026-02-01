/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  // GitHub Pages configuration
  // Update this to match your repository name
  basePath: '/aws',
  assetPrefix: '/aws/',
}

module.exports = nextConfig
