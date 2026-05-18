import { defineConfig } from "vite";

export default defineConfig({
  root: "./dev",
  publicDir: "../public",
  server: {
    open: true,
    fs: {
      allow: [".."],
    },
  },
});
