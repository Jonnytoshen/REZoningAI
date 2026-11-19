import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const repository = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const { PORT } = loadEnv(mode, repository, 'PORT');
  return {
    root,
    plugins: [react()],
    resolve:
      command === 'serve'
        ? { conditions: [...defaultClientConditions, 'rezoning-source'] }
        : undefined,
    server: {
      host: '127.0.0.1',
      fs: { allow: [repository] },
      proxy: { '/api': `http://127.0.0.1:${process.env.PORT || PORT || '3000'}` },
    },
    build: { outDir: '../../dist/web', emptyOutDir: true },
  };
});
