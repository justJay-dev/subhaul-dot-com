// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.haulco.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        // Exclude 404 and other error pages
        return !page.includes('/404');
      },
      customPages: ['https://www.haulco.com/book-a-move'],
      serialize(item) {
        // Set priority and changefreq based on URL patterns
        if (item.url === 'https://www.haulco.com/') {
          // Homepage gets highest priority
          item.priority = 1.0;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        } else if (item.url.includes('/compliance/')) {
          // Compliance pages are important but static
          item.priority = 0.8;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        } else if (item.url.includes('/moving/')) {
          // Moving route pages
          item.priority = 0.7;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        } else {
          // Other pages
          item.priority = 0.6;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        }

        // Add lastmod (current date for static site generation)
        item.lastmod = new Date().toISOString();

        return item;
      },
    }),
  ],
  output: 'static',
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0)
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Optimize CSS and JS minification
      cssMinify: true,
      minify: 'esbuild', // Use esbuild for faster builds
    },
  },
  compressHTML: true,
  build: {
    format: 'file',
    inlineStylesheets: 'auto',
  },
});
