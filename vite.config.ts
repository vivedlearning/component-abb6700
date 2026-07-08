import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "ABB6700",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: [
        "@vived/core",
        "@vived/app",
        "@babylonjs/core",
        "react",
        "react-dom",
      ],
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
