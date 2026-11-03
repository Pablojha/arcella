import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PRODUCTION_API = 'arcella-api-pablojha.onrender.com';

/**
 * `vite preview` sends the same security headers as Vercel (from vercel.json), pointed at the local API, so a
 * Content-Security-Policy problem shows up locally before it reaches production.
 */
function previewHeaders() {
  const { headers } = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const api = new URL(process.env.VITE_API_URL || 'http://localhost:5000');
  const local = (value) =>
    value
      .replaceAll(`https://${PRODUCTION_API}`, api.origin)
      .replaceAll(`wss://${PRODUCTION_API}`, `${api.protocol === 'https:' ? 'wss' : 'ws'}://${api.host}`)
      .replace('; upgrade-insecure-requests', '');
  return Object.fromEntries(headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key, local(value)]));
}

/** Libraries in their own chunks, so an app release doesn't make returning visitors download them again. */
function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'react';
  if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
  if (/[\\/]node_modules[\\/](socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser)[\\/]/.test(id)) return 'realtime';
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { headers: previewHeaders() },
  build: { rollupOptions: { output: { manualChunks: vendorChunk } } },
});
