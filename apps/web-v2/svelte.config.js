import adapter from '@sveltejs/adapter-auto'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
    alias: {
      '@': './src/lib',
    },
  },
}

export default config
