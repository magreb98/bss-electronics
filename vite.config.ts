import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/commerce\/products/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "bss-products",
              expiration: { maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /\/commerce\/customers/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "bss-customers",
              expiration: { maxAgeSeconds: 1800 },
            },
          },
          {
            urlPattern: /\/commerce\/payment-methods/,
            handler: "CacheFirst",
            options: {
              cacheName: "bss-payment-methods",
              expiration: { maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/commerce\//,
            handler: "NetworkFirst",
            options: { cacheName: "bss-api", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/commerce": {
        target: "http://localhost:8000",
        changeOrigin: true,
        headers: { Host: "iphonecameroun.com" },
      },
      "/electronics": {
        target: "http://localhost:8000",
        changeOrigin: true,
        headers: { Host: "iphonecameroun.com" },
      },
      "/storage": {
        target: "http://localhost:8000",
        changeOrigin: true,
        headers: { Host: "iphonecameroun.com" },
      },
    },
  },
});
