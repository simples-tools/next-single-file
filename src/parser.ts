import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import type { ParsedOutput, Route } from "./types";

async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function htmlPathToRoute(htmlPath: string, baseDir: string): string {
  const relPath = relative(baseDir, htmlPath);
  const route = relPath
    .replace(/\.html$/, "")
    .replace(/\\/g, "/")
    .replace(/\/index$/, "")
    .replace(/^index$/, "/");
  return route.startsWith("/") ? route : "/" + route;
}

async function findBuildId(outDir: string): Promise<string> {
  try {
    const staticDir = join(outDir, "_next", "static");
    const entries = await readdir(staticDir, { withFileTypes: true });
    const buildDir = entries.find((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "chunks" && e.name !== "media");
    return buildDir?.name || "unknown";
  } catch {
    return "unknown";
  }
}

export async function parseNextOutput(outDir: string): Promise<ParsedOutput> {
  const buildId = await findBuildId(outDir);
  const allFiles = await walk(outDir);

  const routes: Route[] = [];
  const cssFiles = new Map<string, string>();
  const jsFiles = new Map<string, string>();
  const fontFiles = new Map<string, ArrayBuffer>();
  const imageFiles = new Map<string, ArrayBuffer>();

  for (const file of allFiles) {
    const relPath = "/" + relative(outDir, file).replace(/\\/g, "/");
    const ext = extname(file).toLowerCase();

    if (ext === ".html") {
      const htmlContent = await readFile(file, "utf-8");
      routes.push({
        path: htmlPathToRoute(file, outDir),
        htmlFile: file,
        htmlContent,
      });
    } else if (ext === ".css") {
      cssFiles.set(relPath, await readFile(file, "utf-8"));
    } else if (ext === ".js") {
      jsFiles.set(relPath, await readFile(file, "utf-8"));
    } else if ([".woff2", ".woff", ".ttf", ".otf"].includes(ext)) {
      const buffer = await readFile(file);
      fontFiles.set(relPath, buffer.buffer);
    } else if ([".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif"].includes(ext)) {
      const buffer = await readFile(file);
      imageFiles.set(relPath, buffer.buffer);
    }
  }

  return {
    buildId,
    routes,
    cssFiles,
    jsFiles,
    fontFiles,
    imageFiles,
  };
}
