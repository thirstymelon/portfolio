import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://lokeshpanditi.qzz.io',
  output: 'static',
  build: {
    format: 'directory'
  },
  server: {
    host: true,
    port: 4321
  },
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', 'asia-mar-explorer-tar.trycloudflare.com']
    },
    preview: {
      allowedHosts: ['.trycloudflare.com', 'asia-mar-explorer-tar.trycloudflare.com']
    }
  }
});
