/** [LAYER: UI] */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const proxy = { '/api': { target: process.env.CINDER_API_URL || 'http://localhost:3000', changeOrigin: true } };

export default defineConfig({ root, publicDir: false, server: { proxy }, preview: { proxy }, build: { outDir: 'dist' } });