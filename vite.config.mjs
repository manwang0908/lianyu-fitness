import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localApi } from './scripts/local-api-plugin.mjs';

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    watch: { usePolling: true },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(),localApi()],
});
