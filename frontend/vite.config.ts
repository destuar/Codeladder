import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
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
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
