import { parseNextOutput } from "./parser";
import { inlineAssets } from "./inliner";
import { generateRouterShim } from "./router";
import { bundleToSingleHtml } from "./bundler";
import { resolve } from "node:path";

function getTestExportDir(): string {
    return resolve("test-next-app/out");
}

function formatBytes(bytes: number): string {
    return (bytes / 1024).toFixed(2) + " KB";
}

function formatMs(ms: number): string {
    return ms.toFixed(2) + " ms";
}

interface BenchmarkResult {
    name: string;
    duration: number;
    outputSize: number;
    memoryUsage: number;
}

async function benchmarkNative(exportDir: string): Promise<BenchmarkResult> {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const parsed = await parseNextOutput(exportDir);
    const inlined = await inlineAssets(parsed);
    const routerShim = await generateRouterShim(inlined.routes);
    const html = bundleToSingleHtml(inlined, routerShim);

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
        name: "next-single-file",
        duration: endTime - startTime,
        outputSize: Buffer.byteLength(html, "utf-8"),
        memoryUsage: endMemory - startMemory,
    };
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const iterArg = args.find((a) => a.startsWith("--iter="));
    const iterations = iterArg ? parseInt(iterArg.split("=")[1] ?? "1", 10) : 3;

    const exportDir = getTestExportDir();

    console.log("=".repeat(50));
    console.log("next-single-file Benchmark");
    console.log("=".repeat(50));
    console.log(`Input: ${exportDir}`);
    console.log(`Iterations: ${iterations}`);
    console.log();

    const results: BenchmarkResult[] = [];

    for (let i = 0; i < iterations; i++) {
        process.stdout.write(`Running iteration ${i + 1}/${iterations}...`);
        const result = await benchmarkNative(exportDir);
        results.push(result);
        console.log(` ${formatMs(result.duration)}`);
    }

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const avgOutputSize = results.reduce((sum, r) => sum + r.outputSize, 0) / results.length;
    const avgMemory = results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length;

    console.log();
    console.log("=".repeat(50));
    console.log("Results (averaged over " + iterations + " runs)");
    console.log("=".repeat(50));
    console.log(`Duration:   ${formatMs(avgDuration)}`);
    console.log(`Output:     ${formatBytes(avgOutputSize)}`);
    console.log(`Memory:     ${formatBytes(avgMemory)}`);
    console.log();
    console.log("Star us: https://github.com/simples-tools/next-single-file");
    console.log("Report bugs: https://github.com/simples-tools/next-single-file/issues");
}

main().catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
});
