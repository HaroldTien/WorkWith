import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Base configuration
    base: './',
    
    // Build configuration
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                // Electron apps don't need code splitting
                manualChunks: undefined,
                // Ensure CSS files are properly bundled
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.');
                    const ext = info[info.length - 1];
                    if (/\.(css)$/.test(assetInfo.name)) {
                        return `css/[name]-[hash][extname]`;
                    }
                    if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
                        return `images/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                }
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
        devSourcemap: true,
        // Ensure CSS is properly processed
        postcss: {
            plugins: []
        }
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
    },
    
    // Public directory for static assets
    publicDir: 'assets'
});