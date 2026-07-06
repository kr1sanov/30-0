#!/usr/bin/env node

/**
 * Supabase MCP Server CLI Wrapper
 * 
 * Usage:
 *   node supabase-mcp.mjs [options]
 * 
 * Options:
 *   --access-token <token>   Supabase Personal Access Token (or set SUPABASE_ACCESS_TOKEN env)
 *   --project-ref <ref>      Scope to a specific Supabase project
 *   --read-only              Run in read-only mode (recommended)
 *   --features <list>        Comma-separated feature groups: account,database,debugging,development,docs,functions,storage,branching
 *   --api-url <url>          Custom API URL (default: https://api.supabase.com)
 * 
 * Environment Variables:
 *   SUPABASE_ACCESS_TOKEN    Personal access token (required)
 * 
 * Example:
 *   SUPABASE_ACCESS_TOKEN=xxx node supabase-mcp.mjs --project-ref abc123 --read-only --features database,docs
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const SUPABASE_MCP_DIR = resolve('/home/z/supabase-mcp/packages/mcp-server-supabase');
const STDIO_ENTRY = resolve(SUPABASE_MCP_DIR, 'dist/transports/stdio.js');

// Forward all args to the actual MCP server
const args = process.argv.slice(2);

console.error('[supabase-mcp] Starting Supabase MCP Server (stdio transport)...');
console.error('[supabase-mcp] Working dir:', SUPABASE_MCP_DIR);

const child = spawn('node', [STDIO_ENTRY, ...args], {
  cwd: SUPABASE_MCP_DIR,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_PATH: resolve('/home/z/supabase-mcp/node_modules'),
  },
});

// Pipe stdin/stdout for MCP protocol (must be clean JSON-RPC)
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);

// Log stderr for debugging
child.stderr.on('data', (data) => {
  console.error('[supabase-mcp]', data.toString().trim());
});

child.on('close', (code) => {
  console.error('[supabase-mcp] Process exited with code', code);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[supabase-mcp] Error:', err.message);
  process.exit(1);
});
