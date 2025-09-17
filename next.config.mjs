/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
        module: false,
      }
    }
    return config
  },
}

export default nextConfig

