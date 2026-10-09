import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    manifest: {
      name: 'TAKIP — Cover before you share', short_name: 'TAKIP',
      description: 'On-device privacy filter for your photos.',
      theme_color: '#164d3e', background_color: '#f4f5ef', display: 'standalone',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: { maximumFileSizeToCacheInBytes: 95 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,svg,png,wasm,json,onnx,tflite,gz,mjs,txt}'] },
  })],
  worker: { format: 'es' },
});
