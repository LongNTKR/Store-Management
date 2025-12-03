import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - large libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react'],
          // Page chunks - code split by route
          'pages-home': ['./src/pages/HomePage.tsx'],
          'pages-products': ['./src/pages/ProductsPage.tsx'],
          'pages-customers': ['./src/pages/CustomersPage.tsx'],
          'pages-invoices': ['./src/pages/InvoicesPage.tsx'],
          'pages-stats': ['./src/pages/StatsPage.tsx'],
        },
      },
    },
    // Minification with esbuild (built-in)
    minify: 'esbuild',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
})
