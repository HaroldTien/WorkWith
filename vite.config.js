import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Base configuration
    base: './',
    
    // Build configuration
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                // Electron apps don't need code splitting
                manualChunks: undefined
            }
        }
    },
    
    // Development server configuration
    server: {
        port: 5173,
        strictPort: true,
        host: 'localhost',
        hmr: {
            port: 5174
        }
    },
    
    // Optimization for Electron
    define: {
        global: 'globalThis'
    },
    
    // CSS configuration
    css: {
        devSourcemap: true
    },
    
    // Plugin configuration
    plugins: [],
    
    // Resolve configuration
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    
    // Clear screen on rebuild in dev
    clearScreen: false,
    
    // Electron-specific optimizations
    optimizeDeps: {
        exclude: ['electron']
    }
});