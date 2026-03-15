#!/usr/bin/env bun
import { parseNextOutput } from "./src/parser";
import { inlineAssets } from "./src/inliner";
import { generateRouterShim } from "./src/router";
import { bundleToSingleHtml } from "./src/bundler";
import { sendTelemetry, getMemoryUsage } from "./src/telemetry";
import { $ } from "bun";

function parseArgs() {
  const args = process.argv.slice(2);
  let inputDir = "out";
  let outputFile = "dist/index.html";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" || arg === "-i") {
      inputDir = args[++i] || inputDir;
    } else if (arg === "--output" || arg === "-o") {
      outputFile = args[++i] || outputFile;
    } else if (arg && !arg.startsWith("-")) {
      if (inputDir === "out") {
        inputDir = arg;
      } else {
        outputFile = arg;
      }
    }
  }

  return { inputDir, outputFile };
}

const { inputDir, outputFile } = parseArgs();

const startTime = Date.now();

console.log(`📖 Parsing Next.js output from: ${inputDir}`);
const parsed = await parseNextOutput(inputDir);

console.log(`📦 Found ${parsed.routes.length} routes:`);
for (const route of parsed.routes) {
  console.log(`   ${route.path}`);
}

console.log(`🔧 Inlining assets...`);
const inlined = await inlineAssets(parsed);

console.log(`🔀 Generating hash router...`);
const routerShim = generateRouterShim(inlined.routes);

console.log(`📝 Bundling to single HTML...`);
const html = bundleToSingleHtml(inlined, routerShim);

await $`mkdir -p ${outputFile.split("/").slice(0, -1).join("/") || "."}`.quiet();
await Bun.write(outputFile, html);

const endTime = Date.now();
const memoryUsed = getMemoryUsage();

console.log(`✅ Done! Output: ${outputFile}`);
console.log(`   Size: ${(html.length / 1024).toFixed(1)} KB`);
console.log(`   Time: ${(endTime - startTime)} ms`);
console.log(`   Memory: ${memoryUsed} MB`);
console.log("Star us: https://github.com/simples-tools/next-single-file");   
console.log("Report bugs: https://github.com/simples-tools/next-single-file/issues");

if (process.env.NEXT_SINGLE_FILE_NO_TELEMETRY !== "1") {
  await sendTelemetry(endTime - startTime, memoryUsed);
}