#!/usr/bin/env node
/**
 * Context7 MCP CLI wrapper - communicates with @upstash/context7-mcp via stdio
 * 
 * Usage:
 *   node ctx7-mcp.mjs resolve <library_name> [query]
 *   node ctx7-mcp.mjs docs <library_id> <query>
 *   node ctx7-mcp.mjs list-tools
 *   node ctx7-mcp.mjs raw <method> [params_json]
 * 
 * Examples:
 *   node ctx7-mcp.mjs resolve react
 *   node ctx7-mcp.mjs resolve nextjs "app router middleware"
 *   node ctx7-mcp.mjs docs /vercel/next.js "middleware authentication"
 *   node ctx7-mcp.mjs docs /prisma/prisma "one-to-many relations"
 *   node ctx7-mcp.mjs list-tools
 */

import { spawn } from 'child_process';

const MCP_CMD = 'npx';
const MCP_ARGS = ['-y', '@upstash/context7-mcp'];

class MCPClient {
  constructor() {
    this.proc = null;
    this.buffer = '';
    this.messageId = 0;
    this.pending = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.proc = spawn(MCP_CMD, MCP_ARGS, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.proc.stdout.on('data', (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          if (line.trim()) {
            try {
              const msg = JSON.parse(line);
              if (msg.id && this.pending.has(msg.id)) {
                const { resolve: res } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                res(msg);
              }
            } catch (e) {}
          }
        }
      });

      this.proc.stderr.on('data', () => {});
      this.proc.on('error', reject);
      setTimeout(resolve, 500);
    });
  }

  async call(method, params = {}, timeoutMs = 20000) {
    const id = ++this.messageId;
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    this.proc.stdin.write(msg + '\n');
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve });
      setTimeout(() => { this.pending.delete(id); reject(new Error(`Timeout after ${timeoutMs}ms`)); }, timeoutMs);
    });
  }

  notify(method, params = {}) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  async initialize() {
    const resp = await this.call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ctx7-mcp-cli', version: '1.0' },
    }, 5000);
    this.notify('notifications/initialized');
    await new Promise(r => setTimeout(r, 200));
    return resp;
  }

  async toolCall(name, arguments_, timeoutMs = 30000) {
    return this.call('tools/call', { name, arguments: arguments_ || {} }, timeoutMs);
  }

  stop() {
    if (this.proc) this.proc.kill();
  }
}

function formatResult(result) {
  if (!result) return '';
  if (result.error) return `Error: ${JSON.stringify(result.error)}`;
  if (result.result?.content) {
    return result.result.content.map(c => {
      if (c.type === 'text') return c.text;
      if (c.type === 'image') return `[Image: ${c.mimeType}]`;
      return JSON.stringify(c);
    }).join('\n');
  }
  return JSON.stringify(result.result, null, 2);
}

async function main() {
  const mode = process.argv[2];

  if (!mode) {
    console.error(`Usage: node ctx7-mcp.mjs <command> [args...]

Commands:
  resolve <library_name> [query]     Resolve library name to Context7 ID
  docs <library_id> <query>          Get documentation for a library
  list-tools                         List available MCP tools
  raw <method> [params_json]         Raw MCP method call

Examples:
  node ctx7-mcp.mjs resolve react
  node ctx7-mcp.mjs resolve nextjs "app router"
  node ctx7-mcp.mjs docs /vercel/next.js "middleware authentication"
  node ctx7-mcp.mjs docs /prisma/prisma "schema relations"
`);
    process.exit(1);
  }

  const client = new MCPClient();

  try {
    await client.start();
    await client.initialize();

    if (mode === 'resolve') {
      const libraryName = process.argv[3];
      const query = process.argv[4] || libraryName;
      if (!libraryName) {
        console.error('Error: library name required');
        process.exit(1);
      }
      const r = await client.toolCall('resolve-library-id', { libraryName, query });
      console.log(formatResult(r));
    } else if (mode === 'docs') {
      const libraryId = process.argv[3];
      const query = process.argv[4] || '';
      if (!libraryId || !query) {
        console.error('Error: library ID and query required');
        console.error('Usage: node ctx7-mcp.mjs docs /vercel/next.js "middleware"');
        process.exit(1);
      }
      const r = await client.toolCall('query-docs', { libraryId, query });
      console.log(formatResult(r));
    } else if (mode === 'list-tools') {
      const r = await client.call('tools/list', {}, 5000);
      if (r.result?.tools) {
        console.log('Available tools:');
        r.result.tools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));
      }
    } else if (mode === 'raw') {
      const method = process.argv[3];
      const paramsStr = process.argv[4] || '{}';
      const r = await client.call(method, JSON.parse(paramsStr), 20000);
      console.log(formatResult(r));
    } else {
      console.error(`Unknown command: ${mode}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    client.stop();
  }
}

main();
