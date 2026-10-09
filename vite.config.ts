import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages project sites serve from /<repo>/, so the deploy build sets VITE_BASE=/takip/.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', injectRegister: false,
    manifest: {
      name: 'TAKIP — Cover before you share', short_name: 'TAKIP',
      description: 'On-device privacy filter for your photos.',
      theme_color: '#efeae0', background_color: '#efeae0', display: 'standalone',
      icons: [
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    injectManifest: {
      maximumFileSizeToCacheInBytes: 95 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,svg,png,wasm,json,onnx,tflite,gz,mjs,txt}'],
      // OCR uses LSTM_ONLY; retain all three LSTM variants for browser feature detection.
      globIgnores: ['summary/qwen/**', 'summary/manifest.json',
        'ocr/core/tesseract-core.wasm*', 'ocr/core/tesseract-core-simd.wasm*', 'ocr/core/tesseract-core-relaxedsimd.wasm*'],
    },
  })],
  worker: { format: 'es' },
});
