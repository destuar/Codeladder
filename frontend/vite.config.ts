import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'react-icons': ['react-icons', 'react-icons/fc', 'react-icons/fa']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      '@monaco-editor/react',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-tabs',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      'monaco-editor/esm/vs/editor/editor.api',
      'react-markdown',
      'react-syntax-highlighter',
      'react-syntax-highlighter/dist/esm/styles/prism',
      'remark-gfm',
      'react-icons',
      'react-icons/fc',
      'react-icons/fa'
    ],
    exclude: []
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
