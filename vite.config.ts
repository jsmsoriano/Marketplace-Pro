import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createAppApiMiddleware } from "./server/app-api.mjs";

function researchApiPlugin(): Plugin {
  return {
    name: "research-api",
    configureServer(server) {
      server.middlewares.use(createAppApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createAppApiMiddleware());
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    server: {
      host: "127.0.0.1",
      port: 8080,
    },
    plugins: [react(), researchApiPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
