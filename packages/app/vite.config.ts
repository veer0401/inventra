/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@inventra/design-tokens": path.resolve(__dirname, "../design-tokens/src"),
      "@inventra/ui": path.resolve(__dirname, "../ui/src"),
      "@inventra/api-client": path.resolve(__dirname, "../api-client/src"),
      "@inventra/api-types": path.resolve(__dirname, "../api-types/src"),
      "@inventra/validation": path.resolve(__dirname, "../validation/src"),
      "@inventra/shared": path.resolve(__dirname, "../shared/src"),
      "@inventra/print": path.resolve(__dirname, "../print/src"),
      "@inventra/offline-storage": path.resolve(__dirname, "../offline-storage/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
