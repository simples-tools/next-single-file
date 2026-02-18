# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

This is a CLI tool that converts Next.js static exports into a single HTML file with hash-based routing. It inlines all assets (CSS, JS, images) into one portable HTML file.

## Build, Test, and Lint Commands

```bash
# Run all tests
bun test

# Run a single test file
bun test src/bundle.test.ts

# Run tests matching a pattern
bun test -t "test name pattern"

# Build the CLI
bun run build

# Run the converter locally
bun run ./index.ts <path-to-nextjs-export>
```

Note: This project does not have a lint command configured. The test-next-app workspace has `bun run lint` which runs ESLint on that subproject.

## Code Style Guidelines

### Imports

```ts
// Use import type for type-only imports
import type { Route, ParsedOutput } from "./types";

// Node.js built-ins use node: prefix
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

// Bun APIs (no imports needed for built-in Bun globals)
// Use Bun.$ for shell commands
// Use Bun.write for file output
// Use Bun.file for reading files
```

### TypeScript Configuration

- Strict mode enabled with additional checks
- `verbatimModuleSyntax: true` - requires explicit `import type`
- `noUncheckedIndexedAccess: true` - array/object access may be undefined
- `noFallthroughCasesInSwitch: true`
- `noImplicitOverride: true`
- Target: ESNext, Module: Preserve

### Types and Interfaces

- Use `interface` for object types, not `type`
- Use `Map<K, V>` for key-value collections
- Export interfaces from a central `types.ts` file

```ts
// Preferred
export interface Route {
  path: string;
  html: string;
}

// Avoid
export type Route = {
  path: string;
  html: string;
};
```

### Functions

- Use camelCase for function and variable names
- Use async/await for asynchronous operations
- Return typed Promises explicitly when helpful

```ts
export async function parseRoutes(outputDir: string): Promise<ParsedOutput> {
  // implementation
}
```

### Error Handling

- Throw `Error` objects with descriptive messages
- Validate inputs at function boundaries

```ts
if (!routes.length) {
  throw new Error("No routes found in the Next.js export");
}
```

### Code Formatting

- No comments in production code (code should be self-documenting)
- Use template literals for multi-line strings and HTML generation
- Use `$` template tag for shell commands: `await Bun.$`echo hello``

### Testing

- Use `bun:test` framework
- Place tests adjacent to source files with `.test.ts` suffix
- Use `beforeAll` for expensive setup (e.g., building test fixtures)
- Use `expect` assertions from bun:test

```ts
import { test, expect, beforeAll } from "bun:test";

test("description of what is being tested", async () => {
  const result = await functionUnderTest();
  expect(result).toBe(expected);
});
```

### File Operations

- Prefer Bun APIs over Node.js equivalents
- Use `Bun.file()` for reading, `Bun.write()` for writing
- Use `node:fs/promises` for directory operations (readdir, mkdir)

```ts
// Reading a file
const content = await Bun.file(path).text();

// Writing a file
await Bun.write(outputPath, content);

// Directory operations
import { readdir, mkdir } from "node:fs/promises";
const files = await readdir(dir);
```

### Shell Commands

```ts
// Use Bun.$ for shell commands
await Bun.$`bun run build`;

// With working directory
await Bun.$`bun run build`.cwd(projectDir);
```

## Bun Runtime Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env files; don't use dotenv

### Bun APIs

- `Bun.serve()` for HTTP servers (don't use express)
- `bun:sqlite` for SQLite (don't use better-sqlite3)
- `Bun.redis` for Redis (don't use ioredis)
- `Bun.sql` for Postgres (don't use pg or postgres.js)
- `WebSocket` is built-in (don't use ws package)
- Prefer `Bun.file` over `node:fs` readFile/writeFile
- `Bun.$` for shell commands (instead of execa)

## Project Structure

```
/
├── index.ts          # CLI entry point
├── src/
│   ├── bundler.ts    # Main bundling logic
│   ├── parser.ts     # Parse Next.js export structure
│   ├── router.ts     # Generate client-side router shim
│   ├── inliner.ts    # Inline CSS/JS/images into HTML
│   ├── types.ts      # Shared TypeScript interfaces
│   └── *.test.ts     # Test files adjacent to source
└── test-next-app/    # Test fixture Next.js app
```

## Important Notes

- This tool targets static Next.js exports (output from `next build` + `next export` or `output: export`)
- The generated HTML uses hash-based routing for client-side navigation
- All assets are inlined as base64 data URLs or inline scripts/styles
