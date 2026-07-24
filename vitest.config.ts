import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest needs the same `@/*` path alias that tsconfig.json defines, because the
 * authoring layer imports the engine via `@/lib/engine/...`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
