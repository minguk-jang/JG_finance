import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
          }
        }
      },
      plugins: [
        react(),
        VitePWA({
          // 개발 환경에서 PWA 작동 활성화
          devOptions: {
            enabled: true,
            type: 'module',
            navigateFallback: 'index.html'
          },

          // Service Worker 파일 설정
          injectManifest: {
            // 수동 Service Worker 사용 (src/sw.ts)
            swSrc: 'src/sw.ts',
            swDest: 'dist/sw.js',
            globDirectory: 'dist',
            globPatterns: [
              '**/*.{js,css,html}',
              'components/icons/*.{png,svg,ico}'
            ],
            globIgnores: [
              '**/node_modules/**/*',
              'dist/mockServiceWorker.js'
            ]
          },

          // Manifest 설정
          manifest: {
            name: '쭈꾹 가계부',
            short_name: '쭈꾹',
            description: '가계 재무 관리 애플리케이션',
            theme_color: '#0ea5e9',
            background_color: '#fff5f7',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            orientation: 'portrait-primary',
            screenshots: [
              {
                src: '/components/icons/icon-192.png',
                sizes: '192x192',
                form_factor: 'narrow',
                type: 'image/png'
              },
              {
                src: '/components/icons/icon-512.png',
                sizes: '512x512',
                form_factor: 'wide',
                type: 'image/png'
              }
            ],
            icons: [
              {
                src: '/components/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/components/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/components/icons/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/components/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },

          // Service Worker 등록 설정
          outDir: 'dist',
          injectRegister: 'auto',
          registerType: 'autoUpdate',

          // 자동 업데이트 처리
          includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml']
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
