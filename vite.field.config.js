// Builds the Field Reports app (Microsoft 365 version) for GitHub Pages.
// The Base44 app keeps using vite.config.js and is not affected.
//   npx vite build --config vite.field.config.js   → dist-field/
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');

export default defineConfig({
  root: path.join(here, 'field'),
  base: '/Daily_Report/',
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwind({ config: path.join(here, 'tailwind.config.js'), content: [path.join(src, '**/*.{js,jsx,ts,tsx}'), path.join(here, 'field/**/*.{html,jsx}')] }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: [
      // Report screens talk to SharePoint instead of Base44 in this build.
      { find: '@/api/base44Client', replacement: path.join(src, 'field/spAdapter.js') },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  build: {
    outDir: path.join(here, 'dist-field'),
    emptyOutDir: true,
  },
});
