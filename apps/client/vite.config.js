import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@smart-fridge/shared': path.resolve(__dirname, '../../packages/shared/src')
        }
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        fs: {
            allow: [
                path.resolve(__dirname),
                path.resolve(__dirname, '../../packages/shared/src'),
                path.resolve(__dirname, '../../packages/shared')
            ]
        }
    }
});
