import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    assetsInlineLimit: 1024 * 1024, // inline assets up to 1MB (covers mp3s)
  },
  plugins: [viteSingleFile()],
});
