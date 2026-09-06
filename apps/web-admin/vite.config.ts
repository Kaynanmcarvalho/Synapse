import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5174, strictPort: true },
  preview: { port: 5174 },
  build: { outDir: 'dist', sourcemap: true },
});
