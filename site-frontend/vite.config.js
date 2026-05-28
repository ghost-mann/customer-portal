import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/assets/agriflow/site/',
  build: {
    outDir: path.resolve(__dirname, '../agriflow/public/site'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 8084,
    proxy: { '/api': 'http://localhost:8000', '/assets': 'http://localhost:8000' },
  },
});
