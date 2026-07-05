#!/usr/bin/env node
/**
 * Playwright MCP CLI - Persistent session wrapper
 * 
 * Usage modes:
 * 
 * 1. Single command (new session each time):
 *    node pw-mcp.mjs navigate http://localhost:3000
 *    node pw-mcp.mjs snapshot
 *    node pw-mcp.mjs click "button >> text=Играть"
 *    node pw-mcp.mjs screenshot [filename]
 *    node pw-mcp.mjs type "input" "hello"
 *    node pw-mcp.mjs wait 2
 *    node pw-mcp.mjs evaluate "document.title"
 *    node pw-mcp.mjs press Enter
 *    node pw-mcp.mjs back
 *    node pw-mcp.mjs close
 *    node pw-mcp.mjs resize 1280 720
 *    node pw-mcp.mjs list-tools
 *    node pw-mcp.mjs console
 *    node pw-mcp.mjs network
 *
 * 2. Chained commands (single session, comma-separated):
 *    node pw-mcp.mjs chain 'navigate http://localhost:3000,snapshot,click "button >> text=Играть",snapshot'
 *
 * 3. Raw MCP call:
 *    node pw-mcp.mjs raw tools/call '{"name":"browser_navigate","arguments":{"url":"http://localhost:3000"}}'
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const MCP_CMD = 'npx';
const MCP_ARGS = ['@playwright/mcp@latest', '--headless', '--no-sandbox', '--browser', 'chromium'];

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

      // Wait a bit for process to start
      setTimeout(resolve, 500);
    });
  }

  send(method, params = {}) {
    const id = ++this.messageId;
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    this.proc.stdin.write(msg + '\n');
    return id;
  }

  async call(method, params = {}, timeoutMs = 15000) {
    const id = this.send(method, params);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve });
      setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  notify(method, params = {}) {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
    this.proc.stdin.write(msg + '\n');
  }

  async initialize() {
    const resp = await this.call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'pw-mcp-cli', version: '1.0' },
    }, 5000);
    this.notify('notifications/initialized');
    await new Promise(r => setTimeout(r, 100));
    return resp;
  }

  async toolCall(name, arguments_, timeoutMs = 15000) {
    return this.call('tools/call', { name, arguments: arguments_ || {} }, timeoutMs);
  }

  stop() {
    if (this.proc) {
      this.proc.kill();
    }
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

async function executeCommand(client, cmd, ...args) {
  switch (cmd) {
    case 'navigate': {
      const url = args[0] || 'http://localhost:3000';
      const r = await client.toolCall('browser_navigate', { url }, 20000);
      return formatResult(r);
    }
    case 'snapshot': {
      const r = await client.toolCall('browser_snapshot', {}, 10000);
      return formatResult(r);
    }
    case 'click': {
      const target = args[0];
      const element = args[1] || target;
      const r = await client.toolCall('browser_click', { target, element }, 10000);
      return formatResult(r);
    }
    case 'type': {
      const target = args[0];
      const text = args[1] || '';
      const r = await client.toolCall('browser_type', { target, text }, 10000);
      return formatResult(r);
    }
    case 'press': {
      const key = args[0] || 'Enter';
      const r = await client.toolCall('browser_press_key', { key }, 10000);
      return formatResult(r);
    }
    case 'screenshot': {
      const filename = args[0];
      const r = await client.toolCall('browser_take_screenshot', { filename: filename || undefined, type: 'png' }, 10000);
      return formatResult(r);
    }
    case 'wait': {
      const time = parseFloat(args[0]) || 2;
      const r = await client.toolCall('browser_wait_for', { time }, Math.ceil(time * 1000) + 5000);
      return formatResult(r);
    }
    case 'evaluate': {
      const fn = args[0];
      const r = await client.toolCall('browser_evaluate', { function: fn }, 10000);
      return formatResult(r);
    }
    case 'back': {
      const r = await client.toolCall('browser_navigate_back', {}, 10000);
      return formatResult(r);
    }
    case 'close': {
      const r = await client.toolCall('browser_close', {}, 5000);
      return formatResult(r);
    }
    case 'resize': {
      const width = parseInt(args[0]) || 1280;
      const height = parseInt(args[1]) || 720;
      const r = await client.toolCall('browser_resize', { width, height }, 10000);
      return formatResult(r);
    }
    case 'list-tools': {
      const r = await client.call('tools/list', {}, 5000);
      if (r.result?.tools) {
        return 'Available tools:\n' + r.result.tools.map(t => `  - ${t.name}: ${t.description?.substring(0, 80)}`).join('\n');
      }
      return formatResult(r);
    }
    case 'console': {
      const r = await client.toolCall('browser_console_messages', { level: 'error' }, 10000);
      return formatResult(r);
    }
    case 'network': {
      const r = await client.toolCall('browser_network_requests', {}, 10000);
      return formatResult(r);
    }
    case 'fill': {
      const target = args[0];
      const text = args[1] || '';
      const r = await client.toolCall('browser_type', { target, text }, 10000);
      return formatResult(r);
    }
    case 'hover': {
      const target = args[0];
      const r = await client.toolCall('browser_hover', { target }, 10000);
      return formatResult(r);
    }
    case 'select': {
      const target = args[0];
      const values = args.slice(1);
      const r = await client.toolCall('browser_select_option', { target, values }, 10000);
      return formatResult(r);
    }
    default:
      return `Unknown command: ${cmd}`;
  }
}

async function main() {
  const mode = process.argv[2];
  
  if (!mode) {
    console.error(`Usage: node pw-mcp.mjs <command> [args...]
  
Commands:
  navigate <url>           Navigate to URL
  snapshot                 Take accessibility snapshot
  click <target>           Click element
  type <target> <text>     Type text into element
  press <key>              Press a key (Enter, Tab, etc.)
  screenshot [filename]    Take screenshot
  wait <seconds>           Wait for N seconds
  evaluate <js_function>   Evaluate JavaScript
  back                     Go back
  close                    Close browser
  resize <w> <h>           Resize browser window
  console                  Get console messages (errors)
  network                  Get network requests
  list-tools               List available MCP tools
  hover <target>           Hover over element
  select <target> <vals>   Select option(s)
  fill <target> <text>     Fill text field
  
  chain 'cmd1 args,cmd2 args,...'  Execute multiple commands in one session
  raw <method> [params_json]       Raw MCP method call
  
Examples:
  node pw-mcp.mjs navigate http://localhost:3000
  node pw-mcp.mjs snapshot
  node pw-mcp.mjs click "button >> text=Играть"
  node pw-mcp.mjs chain 'navigate http://localhost:3000,snapshot,click "button >> text=Играть",snapshot'
`);
    process.exit(1);
  }

  const client = new MCPClient();
  
  try {
    await client.start();
    await client.initialize();

    if (mode === 'chain') {
      const chainStr = process.argv[3];
      if (!chainStr) {
        console.error('Chain requires a comma-separated list of commands');
        process.exit(1);
      }
      // Simple parse: split by comma, but respect quoted strings
      const commands = [];
      let current = '';
      let inQuote = false;
      for (const ch of chainStr) {
        if (ch === '"') { inQuote = !inQuote; current += ch; }
        else if (ch === ',' && !inQuote) { commands.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      if (current.trim()) commands.push(current.trim());

      for (const cmdStr of commands) {
        const parts = [];
        let part = '';
        let q = false;
        for (const ch of cmdStr) {
          if (ch === '"') { q = !q; part += ch; }
          else if (ch === ' ' && !q) { if (part) { parts.push(part); part = ''; } }
          else { part += ch; }
        }
        if (part) parts.push(part);
        
        // Remove quotes from parts
        const cleanParts = parts.map(p => p.replace(/^"(.*)"$/, '$1'));
        
        const cmd = cleanParts[0];
        const cmdArgs = cleanParts.slice(1);
        
        console.log(`\n--- ${cmd} ${cmdArgs.join(' ')} ---`);
        const result = await executeCommand(client, cmd, ...cmdArgs);
        console.log(result);
      }
    } else if (mode === 'raw') {
      const method = process.argv[3];
      const paramsStr = process.argv[4] || '{}';
      const params = JSON.parse(paramsStr);
      const r = await client.call(method, params, 20000);
      console.log(formatResult(r));
    } else {
      const args = process.argv.slice(3);
      const result = await executeCommand(client, mode, ...args);
      console.log(result);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    client.stop();
  }
}

main();
