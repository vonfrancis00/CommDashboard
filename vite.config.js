import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const appVersion =
  globalThis.process?.env.VERCEL_GIT_COMMIT_SHA ||
  globalThis.process?.env.GITHUB_SHA ||
  new Date().toISOString();

function versionFilePlugin() {
  return {
    name: "version-file",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: appVersion }),
      });
    },
  };
}

export default defineConfig({

  plugins: [
    react(),
    tailwindcss(),
    versionFilePlugin()
  ],

  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },

  build: {
    target: "es2020",
    sourcemap: false,
  },

});
