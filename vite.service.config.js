// Builds the Sussex Irrigation Service Calls app for GitHub Pages:
//   npx vite build --config vite.service.config.js   → dist-field/service-calls/
// It reuses the Graph helper with Sussex's own sign-in settings.
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');

export default defineConfig({
  root: path.join(here, 'service'),
  base: '/Daily_Report/service-calls/',
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwind({ config: path.join(here, 'tailwind.config.js'), content: [path.join(src, '**/*.{js,jsx}'), path.join(here, 'service/**/*.{html,jsx}')] }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@/field/auth', replacement: path.join(src, 'service/auth.js') },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  build: { outDir: path.join(here, 'dist-field/service-calls'), emptyOutDir: true },
});
