/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@inventra/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src"),
      "@inventra/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@inventra/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@inventra/api-types": path.resolve(__dirname, "../../packages/api-types/src"),
      "@inventra/validation": path.resolve(__dirname, "../../packages/validation/src"),
      "@inventra/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
