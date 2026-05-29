import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import proxyOptions from './proxyOptions.js';

// Single project, four build entries (MPA). Each area under Frontend/<area>/
// keeps its own index.html + src (pages/routes), but they share one
// node_modules, one config, and one set of vendor chunks (react, zustand).
//
// Build output → agriflow/public/frontend/<area>/index.html plus a shared
// assets/ dir, served by Frappe at /assets/agriflow/frontend/. The four
// existing routes (/, /portal, /website-shop, /customer-portal) are preserved
// by scripts/build-html.mjs, which writes the four www templates.
const AREAS = ['portal', 'site', 'webshop', 'customer-panel'];

export default defineConfig({
  plugins: [react()],
  base: '/assets/agriflow/frontend/',
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'shared') },
  },
  build: {
    outDir: path.resolve(__dirname, '../agriflow/public/frontend'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        AREAS.map((a) => [a, path.resolve(__dirname, a, 'index.html')]),
      ),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 8080,
    fs: { allow: [__dirname] },
    proxy: proxyOptions('/assets/agriflow/frontend/'),
  },
});
