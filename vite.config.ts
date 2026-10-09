import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', injectRegister: false,
    manifest: {
      name: 'TAKIP — Cover before you share', short_name: 'TAKIP',
      description: 'On-device privacy filter for your photos.',
      theme_color: '#164d3e', background_color: '#f4f5ef', display: 'standalone',
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    injectManifest: { maximumFileSizeToCacheInBytes: 95 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,svg,png,wasm,json,onnx,tflite,gz,mjs,txt}'], globIgnores: ['summary/qwen/**', 'summary/manifest.json'] },
  })],
  define: { __BUILD_VERSION__: JSON.stringify(Date.now().toString()) },
  worker: { format: 'es' },
});
