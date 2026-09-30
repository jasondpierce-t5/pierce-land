import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/domain/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 95 },
    },
  },
});
