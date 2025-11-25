import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import getPort from "get-port";

export default defineConfig(async () => {
  const port = await getPort({ port: 54321 });

  return {
    server: {
      host: true,
      port, // dynamically selected free port
      proxy: {
        "/functions": {
          target: "http://localhost:54321", // backend stays fixed here
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/functions/, ""),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      globals: true,
      testTimeout: 10000,
    },
  };
});