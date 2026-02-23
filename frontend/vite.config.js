import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
            },
            manifest: {
                name: 'Pontaj Digital',
                short_name: 'Pontaj',
                description: 'Construction Timesheet System',
                theme_color: '#2563EB',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:6001',
                changeOrigin: true
            }
        }
    }
})
