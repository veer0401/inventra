import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@inventra/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src"),
      "@inventra/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@inventra/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@inventra/api-types": path.resolve(__dirname, "../../packages/api-types/src"),
      "@inventra/validation": path.resolve(__dirname, "../../packages/validation/src"),
      "@inventra/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@inventra/offline-storage": path.resolve(__dirname, "../../packages/offline-storage/src"),
      "@inventra/print": path.resolve(__dirname, "../../packages/print/src"),
    },
  },
});
