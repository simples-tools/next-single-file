import type { InlinedOutput } from "./types";

function extractHtmlAttrs(html: string): string {
  const htmlMatch = html.match(/<html([^>]*)>/i);
  return (htmlMatch && htmlMatch[1]) ? htmlMatch[1] : ' lang="en"';
}

function extractBodyAttrs(html: string): string {
  const bodyMatch = html.match(/<body([^>]*)>/i);
  return (bodyMatch && bodyMatch[1]) ? bodyMatch[1] : "";
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (titleMatch && titleMatch[1]) ? titleMatch[1] : "App";
}

function extractMeta(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return "";

  const head = headMatch[1] || "";
  const metaTags: string[] = [];

  const metaRegex = /<meta[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(head)) !== null) {
    if (match[0].includes('name="viewport"')) continue;
    metaTags.push(match[0]);
  }

  return metaTags.join("\n");
}

function escapeScriptTag(js: string): string {
  return js.replace(/<\/script>/gi, "<\\/script>");
}

function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
    .replace(/>\s+</g, "><") // Remove whitespace between tags
    .replace(/\s{2,}/g, " ") // Collapse multiple whitespaces
    .trim();
}

export function bundleToSingleHtml(inlined: InlinedOutput, routerShim: string): string {
  const indexRoute = inlined.routes.find((r) => r.path === "/");
  if (!indexRoute) {
    throw new Error("No index route found");
  }

  const htmlAttrs = extractHtmlAttrs(indexRoute.htmlContent);
  const bodyAttrs = extractBodyAttrs(indexRoute.htmlContent);
  const title = extractTitle(indexRoute.headContent);
  const meta = extractMeta(indexRoute.headContent);

  // Runtime shims MUST be at the very top of the head
  const runtimeShims = `
    // SHIM: Next.js/Turbopack runtime fix
    if (typeof document !== 'undefined') {
      if (!document.currentScript) {
        const scripts = document.getElementsByTagName('script');
        Object.defineProperty(document, 'currentScript', {
          get: function() { return scripts[scripts.length - 1] || null; },
          configurable: true
        });
      }
      
      const origGetAttr = HTMLElement.prototype.getAttribute;
      HTMLElement.prototype.getAttribute = function(name) {
        const val = origGetAttr.apply(this, arguments);
        if (name === 'src' && val === null && this.tagName === 'SCRIPT') {
          return ''; 
        }
        return val;
      };
    }
  `;

  const finalHtml = `<!DOCTYPE html><!--${inlined.buildId}-->
<html${htmlAttrs}>
<head>
<meta charset="utf-8">
<script>${runtimeShims}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
${meta}
<title>${title}</title>
<style>
${inlined.inlinedCss}
</style>
<script>
/* NEXT_JS_CHUNKS_START */
${escapeScriptTag(inlined.inlinedJs)}
/* NEXT_JS_CHUNKS_END */
</script>
</head>
<body${bodyAttrs}>
<div id="__next">
${indexRoute.bodyContent}
</div>
<script>
/* ROUTER_SHIM_START */
${escapeScriptTag(routerShim)}
/* ROUTER_SHIM_END */
</script>
</body>
</html>`;

  return minifyHtml(finalHtml);
}
