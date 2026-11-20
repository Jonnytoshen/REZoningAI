import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const repository = fileURLToPath(new URL('../..', import.meta.url));
const source = fileURLToPath(new URL('./src', import.meta.url));
const brandAssets = fileURLToPath(new URL('../../docs/brand/assets', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const { PORT } = loadEnv(mode, repository, 'PORT');
  return {
    root,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': source, '@brand-assets': brandAssets },
      conditions: command === 'serve' ? [...defaultClientConditions, 'rezoning-source'] : undefined,
    },
    server: {
      host: '127.0.0.1',
      fs: { allow: [repository] },
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.PORT || PORT || '3000'}`,
          changeOrigin: false,
        },
      },
    },
    build: { outDir: '../../dist/web', emptyOutDir: true },
  };
});
