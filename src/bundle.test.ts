import { test, expect, beforeAll } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { $ } from "bun";

const OUT_DIR = "test-next-app/out";
const DIST_FILE = "dist/index.html";

beforeAll(async () => {
  console.log("🚀 Preparing for tests...");
  
  if (!existsSync(OUT_DIR)) {
    console.log("📦 Building test-next-app...");
    await $`cd test-next-app && bun run build`.quiet();
  }

  console.log("🛠️ Running converter...");
  await $`bun run index.ts --input ${OUT_DIR} --output ${DIST_FILE}`.quiet();
});

test("Bundle file exists", () => {
  expect(existsSync(DIST_FILE)).toBe(true);
});

test("Bundle has correct HTML structure", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("<html");
  expect(html).toContain("<body");
  expect(html).toContain("</html>");
});

test("All static assets are inlined", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  
  const externalRefs = [
    /_next\/static\/chunks\/.*\.js/g,
    /_next\/static\/chunks\/.*\.css/g,
    /_next\/static\/media\/.*\.(woff2|woff|ttf|otf|svg|png|jpg|ico)/g,
  ];

  for (const ref of externalRefs) {
    const matches = html.match(ref);
    if (matches) {
      // Exclude matches that are already part of a data URI if any
      const problematicMatches = matches.filter(m => !m.startsWith("data:"));
      expect(problematicMatches.length).toBe(0);
    }
  }
});

test("Favicon is inlined", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  expect(html).toContain("data:image/x-icon;base64");
});

test("Fonts are inlined", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  expect(html).toContain("data:font/woff2;base64");
});

test("Router shim is present", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  expect(html).toContain("window.__NEXT_SINGLE_FILE_ROUTER__");
  expect(html).toContain("const ROUTE_MAP_BASE64");
});

test("No unescaped script tags in content", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  const scriptMatch = html.match(/<script[\s\S]*?<\/script>/gi);
  if (scriptMatch) {
    for (const script of scriptMatch) {
      const content = script.replace(/<\/?script.*?>/gi, "");
      // We check if "</script" exists inside the content (not as the closing tag)
      // The bundler should have escaped them
      expect(content).not.toContain("</script>");
    }
  }
});

test("All routes are present in the map", () => {
  const html = readFileSync(DIST_FILE, "utf-8");
  const base64Match = html.match(/const ROUTE_MAP_BASE64 = "([^"]+)"/);
  expect(base64Match).not.toBeNull();
  
  const base64Data = base64Match ? base64Match[1] : "";
  const decoded = Buffer.from(base64Data!, "base64").toString("utf-8");
  const routeMap = JSON.parse(decoded);
  
  expect(routeMap).toHaveProperty("/");
  expect(routeMap).toHaveProperty("/about");
  expect(routeMap).toHaveProperty("/blog");
  expect(routeMap).toHaveProperty("/404");
});
