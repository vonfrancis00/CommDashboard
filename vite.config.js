import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/commtrack-api": {
        target: "https://script.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: () =>
          "/macros/s/AKfycbzN7EZ96dr61NuGiD1UpPSyIan_VjGSfyNr8ge84bHETFrNdvz4PwuTV5IKNHFNrh5BOg/exec",
      },
    },
  },
});