import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle everything into a single HTML file for CLI embedding
    mode === 'embed' ? viteSingleFile() : null,
  ].filter(Boolean),
  build: {
    outDir: 'dist',
    // Generate single file for embedding
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    // Inject audit data at build time
    '__AUDIT_DATA__': mode === 'embed' 
      ? 'window.__FAIL_KIT_DATA__' 
      : JSON.stringify({}),
  },
}));
