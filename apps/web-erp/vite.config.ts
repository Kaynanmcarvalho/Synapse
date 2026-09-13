import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** O `pnpm dev:emulador` roda dentro do `firebase emulators:exec`, que exporta
 *  FIREBASE_AUTH_EMULATOR_HOST. Com ela, a tela fala com o emulador mesmo que o
 *  .env.local aponte para o projeto real: API e tela nunca ficam em projetos
 *  diferentes. */
const emuladorDoAuth = process.env['FIREBASE_AUTH_EMULATOR_HOST'] ?? '';

export default defineConfig({
  plugins: [react()],
  define: { __FIREBASE_AUTH_EMULATOR_HOST__: JSON.stringify(emuladorDoAuth) },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
