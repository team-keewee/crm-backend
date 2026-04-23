import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 10_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/crm_test",
      JWT_SECRET: "dev-test-jwt-secret-min-32-chars-ok!",
    },
  },
});
