#!/usr/bin/env node
import { spawn } from 'child_process';

const SERVER_CONFIGS = {
  filesystem: {
    cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/z/my-project'],
    type: 'node', startupMs: 1200,
  },
  memory: {
    cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'],
    type: 'node', startupMs: 1200,
  },
  thinking: {
    cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    type: 'node', startupMs: 1200,
  },
  everything: {
    cmd: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'],
    type: 'node', startupMs: 1200,
  },
  git: {
    cmd: '/home/z/.local/bin/mcp-server-git',
    args: ['--repository', '/home/z/my-project'],
    type: 'python', startupMs: 1500,
  },
  fetch: {
    cmd: '/home/z/.local/bin/mcp-server-fetch',
    args: [], type: 'python', startupMs: 1500,
  },
  time: {
    cmd: '/home/z/.local/bin/mcp-server-time',
    args: [], type: 'python', startupMs: 1500,
  },
  playwright: {
    cmd: 'npx', args: ['@playwright/mcp@latest', '--headless', '--no-sandbox', '--browser', 'chromium'],
    type: 'node', startupMs: 1500,
  },
  context7: {
    cmd: 'npx', args: ['-y', '@upstash/context7-mcp'],
    type: 'node', startupMs: 1500,
  },
};

class MCPClient {
  constructor(config) {
    this.config = config;
    this.proc = null;
    this.buffer = '';
    this.messageId = 0;
    this.pending = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.proc = spawn(this.config.cmd, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `/home/z/.local/bin:${process.env.PATH}` },
      });
      this.proc.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this._tryParse();
      });
      this.proc.stderr.on('data', () => {});
      this.proc.on('error', reject);
      setTimeout(resolve, this.config.startupMs || 1500);
    });
  }

  _tryParse() {
    while (this.buffer.length > 0) {
      const str = this.buffer.trim();
      if (!str) { this.buffer = ''; break; }
      try {
        const msg = JSON.parse(str);
        this.buffer = '';
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          resolve(msg);
        }
      } catch (e) {
        const nlIdx = this.buffer.indexOf('\n');
        if (nlIdx !== -1) {
          const line = this.buffer.substring(0, nlIdx).trim();
          this.buffer = this.buffer.substring(nlIdx + 1);
          if (line) {
            try {
              const msg = JSON.parse(line);
              if (msg.id && this.pending.has(msg.id)) {
                const { resolve } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                resolve(msg);
              }
            } catch (e2) {}
          }
        } else break;
      }
    }
  }

  async call(method, params = {}, timeoutMs = 30000) {
    const id = ++this.messageId;
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
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
      protocolVersion: '2024-11-05', capabilities: {},
      clientInfo: { name: 'mcp-cli', version: '1.0' },
    }, 8000);
    this.notify('notifications/initialized');
    await new Promise(r => setTimeout(r, 300));
    return resp;
  }

  async toolCall(name, arguments_, timeoutMs = 30000) {
    return this.call('tools/call', { name, arguments: arguments_ || {} }, timeoutMs);
  }

  stop() { if (this.proc) try { this.proc.kill(); } catch (e) {} }
}

function formatResult(result) {
  if (!result) return '';
  if (result.error) return `Error: ${JSON.stringify(result.error, null, 2)}`;
  if (result.result?.content) {
    return result.result.content.map(c => {
      if (c.type === 'text') return c.text;
      if (c.type === 'image') return `[Image: ${c.mimeType}]`;
      return JSON.stringify(c, null, 2);
    }).join('\n');
  }
  return JSON.stringify(result.result, null, 2);
}

function parseKwargs(args) {
  const result = {};
  for (const arg of args) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) continue;
    const key = arg.substring(0, eqIdx);
    let val = arg.substring(eqIdx + 1);
    try { val = JSON.parse(val); } catch (e) {}
    result[key] = val;
  }
  return result;
}

async function main() {
  const serverName = process.argv[2];
  const command = process.argv[3];

  if (!serverName || !command) {
    console.error(`Usage: node mcp.mjs <server> <command> [args...]

Servers: ${Object.keys(SERVER_CONFIGS).join(', ')}

Commands: list-tools, call <tool> [json], exec <tool> [key=val...], raw <method> [json]

Examples:
  node mcp.mjs filesystem list-tools
  node mcp.mjs filesystem exec read_text_file path=/home/z/my-project/package.json
  node mcp.mjs filesystem exec search_files path=/home/z/my-project/src pattern=Header
  node mcp.mjs memory exec read_graph
  node mcp.mjs git exec git_status repo_path=/home/z/my-project
  node mcp.mjs git exec git_log repo_path=/home/z/my-project max_count=5
  node mcp.mjs fetch exec fetch url=https://example.com
  node mcp.mjs time call get_current_time '{"timezone":"Europe/Moscow"}'
  node mcp.mjs context7 resolve react
  node mcp.mjs context7 docs /vercel/next.js "middleware"
  node mcp.mjs playwright navigate http://localhost:3000
  node mcp.mjs playwright snapshot
`);
    process.exit(1);
  }

  // Context7 shortcuts
  if (serverName === 'context7' && (command === 'resolve' || command === 'docs')) {
    const client = new MCPClient(SERVER_CONFIGS.context7);
    try {
      await client.start(); await client.initialize();
      if (command === 'resolve') {
        const r = await client.toolCall('resolve-library-id', { libraryName: process.argv[4], query: process.argv[5] || process.argv[4] });
        console.log(formatResult(r));
      } else {
        const r = await client.toolCall('query-docs', { libraryId: process.argv[4], query: process.argv[5] || '' });
        console.log(formatResult(r));
      }
    } catch (e) { console.error('Error:', e.message); } finally { client.stop(); setTimeout(() => process.exit(0), 100); }
    return;
  }

  // Playwright shortcuts
  if (serverName === 'playwright' && ['navigate','snapshot','click','screenshot','wait','type','press','back','close','evaluate','resize','console','network'].includes(command)) {
    const client = new MCPClient(SERVER_CONFIGS.playwright);
    try {
      await client.start(); await client.initialize();
      const map = { navigate:'browser_navigate', snapshot:'browser_snapshot', click:'browser_click', screenshot:'browser_take_screenshot', wait:'browser_wait_for', type:'browser_type', press:'browser_press_key', back:'browser_navigate_back', close:'browser_close', evaluate:'browser_evaluate', resize:'browser_resize', console:'browser_console_messages', network:'browser_network_requests' };
      const a = process.argv.slice(4); let t = {};
      if (command==='navigate') t={url:a[0]}; else if (command==='click') t={target:a[0],element:a[0]}; else if (command==='type') t={target:a[0],text:a[1]||''}; else if (command==='press') t={key:a[0]||'Enter'}; else if (command==='screenshot') t={filename:a[0],type:'png'}; else if (command==='wait') t={time:parseFloat(a[0])||2}; else if (command==='evaluate') t={function:a[0]}; else if (command==='resize') t={width:parseInt(a[0])||1280,height:parseInt(a[1])||720}; else if (command==='console') t={level:a[0]||'error'};
      const r = await client.toolCall(map[command], t, 20000);
      console.log(formatResult(r));
    } catch (e) { console.error('Error:', e.message); } finally { client.stop(); setTimeout(() => process.exit(0), 100); }
    return;
  }

  const config = SERVER_CONFIGS[serverName];
  if (!config) { console.error(`Unknown server: ${serverName}`); process.exit(1); }

  const client = new MCPClient(config);
  try {
    await client.start(); await client.initialize();

    if (command === 'list-tools') {
      const r = await client.call('tools/list', {}, 8000);
      if (r.result?.tools) {
        console.log(`Tools for "${serverName}":\n`);
        r.result.tools.forEach(t => {
          console.log(`  ${t.name}`);
          console.log(`    ${t.description?.substring(0, 120)||''}`);
          if (t.inputSchema?.properties) {
            Object.entries(t.inputSchema.properties).forEach(([k,v]) => {
              console.log(`      ${k}${t.inputSchema.required?.includes(k)?'*':''}: ${v.type||'any'}`);
            });
          }
          console.log('');
        });
      } else console.log(formatResult(r));
    } else if (command === 'call') {
      const r = await client.toolCall(process.argv[4], JSON.parse(process.argv[5]||'{}'));
      console.log(formatResult(r));
    } else if (command === 'exec') {
      const r = await client.toolCall(process.argv[4], parseKwargs(process.argv.slice(5)));
      console.log(formatResult(r));
    } else if (command === 'raw') {
      const r = await client.call(process.argv[4], JSON.parse(process.argv[5]||'{}'));
      console.log(formatResult(r));
    } else { console.error(`Unknown: ${command}`); process.exit(1); }
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { client.stop(); setTimeout(() => process.exit(0), 100); }
}

main();
