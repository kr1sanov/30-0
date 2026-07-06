#!/usr/bin/env node

/**
 * Browserbase MCP Server CLI Wrapper
 * 
 * Usage:
 *   node browserbase-mcp.mjs [options]
 * 
 * Required Environment Variables:
 *   BROWSERBASE_API_KEY     Your Browserbase API key
 *   BROWSERBASE_PROJECT_ID  Your Browserbase project ID
 *   GEMINI_API_KEY          Gemini API key (for Stagehand AI model)
 * 
 * Options:
 *   --proxies               Enable Browserbase proxies
 *   --verified              Enable Verified Identity (Scale Plan)
 *   --keepAlive             Enable Keep Alive session
 *   --contextId <id>        Specify a Browserbase Context ID
 *   --persist               Persist context (default: true)
 *   --port <port>           Port for HTTP/SHTTP transport
 *   --host <host>           Host to bind to (default: localhost)
 *   --browserWidth <w>      Browser viewport width (default: 1024)
 *   --browserHeight <h>     Browser viewport height (default: 768)
 *   --modelName <model>     Model for Stagehand (default: google/gemini-2.5-flash-lite)
 *   --modelApiKey <key>     API key for custom model provider
 *   --experimental          Enable experimental features
 * 
 * Example:
 *   BROWSERBASE_API_KEY=xxx BROWSERBASE_PROJECT_ID=yyy GEMINI_API_KEY=zzz node browserbase-mcp.mjs
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const BROWSERBASE_DIR = resolve('/home/z/mcp-server-browserbase');
const CLI_ENTRY = resolve(BROWSERBASE_DIR, 'cli.js');

// Forward all args to the actual MCP server
const args = process.argv.slice(2);

console.error('[browserbase-mcp] Starting Browserbase MCP Server (stdio transport)...');
console.error('[browserbase-mcp] Working dir:', BROWSERBASE_DIR);

const child = spawn('node', [CLI_ENTRY, ...args], {
  cwd: BROWSERBASE_DIR,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_PATH: resolve(BROWSERBASE_DIR, 'node_modules'),
  },
});

// Pipe stdin/stdout for MCP protocol (clean JSON-RPC)
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);

// Log stderr for debugging
child.stderr.on('data', (data) => {
  console.error('[browserbase-mcp]', data.toString().trim());
});

child.on('close', (code) => {
  console.error('[browserbase-mcp] Process exited with code', code);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[browserbase-mcp] Error:', err.message);
  process.exit(1);
});
