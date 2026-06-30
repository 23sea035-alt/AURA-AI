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
      include: [
        "server/src/services/auth/**",
        "server/src/services/chat/**",
        "server/src/services/llm/**",
        "server/src/services/memory/**",
        "server/src/services/moderation/**",
        "server/src/services/retention.ts",
        "shared/src/**",
      ],
      thresholds: {
        lines: 80,
        branches: 60,
        functions: 70,
        statements: 80,
      },
    },
  },
});
