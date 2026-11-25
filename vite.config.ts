import { createReadStream, existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * The file of a simulation that the dev server opens at start.
 * `SIMULATION=2026-11-24/my-run npm run dev` opens
 * `simulations/2026-11-24/my-run.answers.tsv` and its `.decisions.jsonl`.
 * `TSV=/path/file.tsv DECISIONS=/path/file.jsonl npm run dev` names each file.
 */
const startFile = (variable: string, suffix: string): string | undefined =>
  process.env[variable] ??
  (process.env.SIMULATION
    ? `simulations/${process.env.SIMULATION}${suffix}`
    : undefined);

/** Serves a start file at a route. The route answers 204 when no file is named or the file does not exist. */
const serveFile = (route: string, variable: string, suffix: string): Plugin => ({
  name: `serve-${variable.toLowerCase()}`,
  configureServer(server) {
    server.middlewares.use(route, (_request, response) => {
      const value = startFile(variable, suffix);
      if (!value || !existsSync(resolve(value))) {
        response.statusCode = 204;
        response.end();
        return;
      }
      const path = resolve(value);
      response.setHeader("Content-Type", "application/octet-stream");
      response.setHeader("Content-Length", statSync(path).size);
      response.setHeader("X-File-Name", basename(path));
      createReadStream(path).pipe(response);
    });
  },
});

/**
 * Puts the built script and styles inside `index.html`. A browser blocks
 * script files of a page opened from disk, so one file is the form that
 * opens with a double-click.
 */
const oneFile = (): Plugin => ({
  name: "one-file",
  enforce: "post",
  generateBundle(_options, bundle) {
    const page = bundle["index.html"];
    if (page?.type !== "asset") return;
    let html = String(page.source);
    for (const [name, file] of Object.entries(bundle)) {
      if (file.type === "chunk") {
        const code = file.code.replaceAll("</script", "<\\/script");
        html = html.replace(
          new RegExp(`<script[^>]*src="\\./${name}"[^>]*></script>`),
          () => `<script type="module">${code}</script>`,
        );
        delete bundle[name];
      }
      if (file.type === "asset" && name.endsWith(".css")) {
        html = html.replace(
          new RegExp(`<link[^>]*href="\\./${name}"[^>]*>`),
          () => `<style>${String(file.source)}</style>`,
        );
        delete bundle[name];
      }
    }
    page.source = html;
  },
});

export default defineConfig({
  // Relative addresses, so the built site works under any path, such as a GitHub Pages project address.
  base: "./",
  plugins: [
    react(),
    oneFile(),
    serveFile("/tsv", "TSV", ".answers.tsv"),
    serveFile("/decisions", "DECISIONS", ".decisions.jsonl"),
  ],
});
