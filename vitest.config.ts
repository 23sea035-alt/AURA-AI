import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: __dirname,
    include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["server/src/**", "shared/src/**"],
      thresholds: {
        lines: 30,
        functions: 40,
        branches: 30,
      },
    },
  },
});
