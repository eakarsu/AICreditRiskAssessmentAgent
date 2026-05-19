import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const srcDir = path.resolve(__dirname, 'src');

export default defineConfig({
  plugins: [
    react({
      include: [/\.jsx?$/, /\.tsx?$/],
    }),
    {
      // Force-load .js files in src/ with the JSX loader so esbuild parses JSX
      name: 'load-js-as-jsx',
      enforce: 'pre',
      async load(id) {
        const file = id.split('?')[0];
        if (!file.startsWith(srcDir)) return null;
        if (!file.endsWith('.js')) return null;
        const fs = await import('fs/promises');
        const code = await fs.readFile(file, 'utf-8');
        return { code };
      },
      async transform(code, id) {
        const file = id.split('?')[0];
        if (!file.startsWith(srcDir)) return null;
        if (!file.endsWith('.js')) return null;
        const esbuild = await import('esbuild');
        const result = await esbuild.transform(code, {
          loader: 'jsx',
          jsx: 'automatic',
          sourcemap: true,
          sourcefile: file,
        });
        return { code: result.code, map: result.map };
      },
    },
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
