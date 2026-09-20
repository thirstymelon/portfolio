import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://lokeshpanditi.qzz.io',
  output: 'static',
  build: {
    format: 'directory'
  }
});
