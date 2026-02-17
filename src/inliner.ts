import type { ParsedOutput, InlinedOutput, InlinedRoute } from "./types";

function extractHeadContent(html: string): string {
  const match = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return (match && match[1]) ? match[1] : "";
}

function extractBodyContent(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match && match[1]) ? match[1] : "";
}

function toDataUri(data: Uint8Array | ArrayBuffer | string, path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  let mime = "application/octet-stream";
  if (ext === "svg") mime = "image/svg+xml";
  else if (ext === "png") mime = "image/png";
  else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
  else if (ext === "webp") mime = "image/webp";
  else if (ext === "ico") mime = "image/x-icon";
  else if (ext === "woff2") mime = "font/woff2";
  else if (ext === "woff") mime = "font/woff";
  else if (ext === "ttf") mime = "font/ttf";
  else if (ext === "otf") mime = "font/otf";
  else if (ext === "js") mime = "application/javascript";
  else if (ext === "css") mime = "text/css";

  const base64 = typeof data === "string" 
    ? Buffer.from(data, "utf-8").toString("base64")
    : Buffer.from(data as any).toString("base64");
    
  return `data:${mime};base64,${base64}`;
}

function extractStyles(html: string): string {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styles = "";
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    styles += match[1] + "\n";
  }
  return styles;
}

export async function inlineAssets(parsed: ParsedOutput): Promise<InlinedOutput> {
  const assetMap = new Map<string, string>();

  // 1. Convert all assets to Data URIs
  for (const [path, buffer] of parsed.fontFiles) {
    assetMap.set(path, toDataUri(buffer, path));
  }
  for (const [path, buffer] of parsed.imageFiles) {
    assetMap.set(path, toDataUri(buffer, path));
  }
  for (const [path, content] of parsed.cssFiles) {
    assetMap.set(path, toDataUri(content, path));
  }
  for (const [path, content] of parsed.jsFiles) {
    assetMap.set(path, toDataUri(content, path));
  }

  const sortedPaths = Array.from(assetMap.keys()).sort((a, b) => b.length - a.length);

  function inlineEverything(content: string): string {
    let result = content;
    for (const path of sortedPaths) {
      const dataUri = assetMap.get(path)!;
      const fileName = path.split("/").pop();
      
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Pattern to match path with optional hostname, escaped quotes, and query strings
      // We look for boundaries like ", ', \, (, or start of string
      const pathPattern = new RegExp(`(?:\\\\?["'\\(\\s,])(?:https?:\\/\\/[^/]+)?${escapedPath}(?:\\?[^\\\\"'\\)\\s,]+)?(?:\\\\?["'\\)\\s,])`, 'g');
      
      result = result.replace(pathPattern, (match) => {
        // Keep the prefix and suffix boundaries
        const prefixMatch = match.match(/^(\\?["'\\(\\s,])/);
        const suffixMatch = match.match(/(\\?["'\\)\\s,])$/);
        const prefix = prefixMatch ? prefixMatch[0] : "";
        const suffix = suffixMatch ? suffixMatch[0] : "";
        return `${prefix}${dataUri}${suffix}`;
      });
      
      if (path.startsWith("/")) {
        const noSlashPath = path.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const noSlashPattern = new RegExp(`(?:\\\\?["'\\(\\s,])(?:https?:\\/\\/[^/]+)?${noSlashPath}(?:\\?[^\\\\"'\\)\\s,]+)?(?:\\\\?["'\\)\\s,])`, 'g');
        result = result.replace(noSlashPattern, (match) => {
          const prefixMatch = match.match(/^(\\?["'\\(\\s,])/);
          const suffixMatch = match.match(/(\\?["'\\)\\s,])$/);
          const prefix = prefixMatch ? prefixMatch[0] : "";
          const suffix = suffixMatch ? suffixMatch[0] : "";
          return `${prefix}${dataUri}${suffix}`;
        });
      }

      if (fileName) {
        const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Catch relative paths common in Next.js assets (with optional query params and escaped quotes)
        const relPattern = new RegExp(`(?:\\\\?["'\\(\\s])(?:\\.\\.?\\/|\\/_next\\/static\\/)?(?:media|chunks|css)\\/${escapedFileName}(?:\\?[^\\\\"'\\)\\s]+)?(?:\\\\?["'\\)\\s])`, 'g');
        result = result.replace(relPattern, (match) => {
          const prefixMatch = match.match(/^(\\?["'\\(\\s])/);
          const suffixMatch = match.match(/(\\?["'\\)\\s])$/);
          const prefix = prefixMatch ? prefixMatch[0] : "";
          const suffix = suffixMatch ? suffixMatch[0] : "";
          return `${prefix}${dataUri}${suffix}`;
        });
      }
    }
    return result;
  }

  // Pre-process CSS and JS content by inlining binary assets into them
  const processedCssFiles = new Map<string, string>();
  for (const [path, content] of parsed.cssFiles) {
    processedCssFiles.set(path, inlineEverything(content));
  }

  const processedJsFiles = new Map<string, string>();
  for (const [path, content] of parsed.jsFiles) {
    processedJsFiles.set(path, inlineEverything(content));
  }

  // Final strings for bundling (common assets)
  let inlinedCss = Array.from(processedCssFiles.values()).join("\n");
  const inlinedJs = Array.from(processedJsFiles.values()).join("\n");

  const routes: InlinedRoute[] = parsed.routes.map((route) => {
    let inlinedHtml = inlineEverything(route.htmlContent);
    
    // Also extract route-specific styles
    const routeStyles = extractStyles(inlinedHtml);
    inlinedCss += "\n" + routeStyles;

    // Final pass to remove preloads which might still reference external files
    inlinedHtml = inlinedHtml.replace(/<link[^>]+rel=["']preload["'][^>]*>/gi, "");

    return {
      path: route.path,
      headContent: extractHeadContent(inlinedHtml),
      bodyContent: extractBodyContent(inlinedHtml),
      htmlContent: inlinedHtml,
    };
  });

  return {
    buildId: parsed.buildId,
    routes,
    inlinedCss,
    inlinedJs,
    allInlinedFiles: assetMap,
  };
}
