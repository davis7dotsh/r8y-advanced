import adapter from '@sveltejs/adapter-vercel'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  kit: {
    adapter: adapter({
      images: {
        sizes: [320, 640, 828, 1080, 1200, 1920],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24 * 7,
        domains: ['i.ytimg.com', 'img.youtube.com'],
      },
    }),
    experimental: {
      remoteFunctions: true,
    },
    alias: {
      '@': './src/lib',
    },
  },
}

export default config
