import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the client's "@/..." import alias so client lib modules are testable here.
    alias: { "@": path.resolve(__dirname, "client") },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts", "client/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "server/src/services/auth/**",
        "server/src/services/chat/**",
        "server/src/services/llm/**",
        "server/src/services/memory.ts",
        "server/src/services/memory/**",
        "server/src/services/moderation/**",
        "server/src/services/payments/**",
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
