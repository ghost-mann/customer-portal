import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/assets/agriflow/webshop/',
  build: {
    outDir: path.resolve(__dirname, '../agriflow/public/webshop'),
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
    port: 8085,
    proxy: { '/api': 'http://localhost:8000', '/assets': 'http://localhost:8000', '/files': 'http://localhost:8000' },
  },
});
