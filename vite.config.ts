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
      // Externalize all @vived/* and @babylonjs/* packages (including subpath
      // imports such as "@babylonjs/loaders/glTF") so peers are not bundled.
      external: [/^@vived\//, /^@babylonjs\//, "react", "react-dom"],
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
