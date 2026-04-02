import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['test/**/*.js']
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/components/index.js'),
            name: 'Scenaria',
            formats: ['es', 'iife'],
            fileName: (format) => `scenaria.${format}.js`
        },
        rollupOptions: {
            output: {
                exports: 'named',
                assetFileNames: 'scenaria.[ext]'
            }
        },
        outDir: 'dist',
        emptyOutDir: true
    }
})
