/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // During builds, we'll handle type checking separately
    ignoreBuildErrors: false,
  },
  eslint: {
    // During builds, we'll handle ESLint separately
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig