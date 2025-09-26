import { defineConfig } from 'vite';
import { resolve } from 'path';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
    // Base configuration
    base: './',
    
    // Build configuration
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: 'assets',
        minify: 'esbuild',
        cssCodeSplit: true,
        sourcemap: false,
        target: 'es2019',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                // Allow Rollup to automatically create shared chunks for better caching
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
        },
        // Drop debug statements in production bundles
        esbuild: isProd ? { drop: ['console', 'debugger'] } : undefined
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
        devSourcemap: !isProd,
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