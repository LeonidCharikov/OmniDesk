/**
 * OmniDesk MCP Server Template (Node.js)
 *
 * Bridges an external AI MCP host (Claude Desktop, Cursor, VS Code, etc.) via stdio
 * to:
 *   1. The running OmniDesk desktop app over a loopback WebSocket bridge
 *      (ws://127.0.0.1:3847/bridge) connected by `src/services/mcpClient.ts`.
 *   2. A strictly scoped local workspace directory (`OMNIDESK_WORKSPACE_DIR`)
 *      for safe file inspection/export without exposing the full filesystem.
 *
 * Environment Variables:
 *   OMNIDESK_MCP_PORT        WebSocket bridge port (default: 3847)
 *   OMNIDESK_MCP_TOKEN       Optional shared secret matching ConfigModal -> MCP Bridge
 *   OMNIDESK_WORKSPACE_DIR   Optional sandboxed folder for local file tools
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { WebSocketServer } from 'ws';

const PROTOCOL_VERSION = '2024-11-05';
const WS_HOST = '127.0.0.1';
const rawPort = process.env.OMNIDESK_MCP_PORT;
const parsedPort = rawPort !== undefined && rawPort.trim() !== '' ? Number(rawPort) : 3847;
const WS_PORT = Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3847;
const BRIDGE_TOKEN = process.env.OMNIDESK_MCP_TOKEN?.trim() || '';
const WORKSPACE_ROOT = process.env.OMNIDESK_WORKSPACE_DIR
  ? path.resolve(process.env.OMNIDESK_WORKSPACE_DIR)
  : null;

/** @type {import('ws').WebSocket | null} */
let activeDesktopSocket = null;
let socketAuthenticated = !BRIDGE_TOKEN;
let clientInitialized = false;
let bridgeRequestCounter = 1;
const pendingBridgeRequests = new Map();

function notifyToolsAndResourcesChanged() {
  if (!clientInitialized) return;
  writeStdio({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
  writeStdio({ jsonrpc: '2.0', method: 'notifications/resources/list_changed' });
}

// ── 1. Built-in Server Diagnostic & Scoped Workspace File Tools ──────────────
const BRIDGE_STATUS_TOOL = {
  name: 'omnidesk_bridge_status',
  description: 'Check whether the OmniDesk desktop application is connected to this MCP server and inspect active bridge settings.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

const LOCAL_FS_TOOLS = WORKSPACE_ROOT
  ? [
      {
        name: 'workspace_list_files',
        description: 'List files inside the configured OmniDesk workspace directory (non-recursive or shallow).',
        inputSchema: {
          type: 'object',
          properties: {
            relativeDir: { type: 'string', description: 'Subdirectory relative to workspace root (default: ".").' },
          },
        },
      },
      {
        name: 'workspace_read_text_file',
        description: 'Read a UTF-8 text file inside the configured OmniDesk workspace directory.',
        inputSchema: {
          type: 'object',
          properties: {
            relativePath: { type: 'string', description: 'File path relative to workspace root.' },
          },
          required: ['relativePath'],
        },
      },
      {
        name: 'workspace_convert_file',
        description: 'Convert a file inside OMNIDESK_WORKSPACE_DIR using OmniDesk Multi-Format Converter and optionally write the converted output back into the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            inputRelativePath: { type: 'string', description: 'Input file path relative to workspace root (max 5 MB).' },
            targetFormat: { type: 'string', description: 'Target extension without dot (e.g. "html", "json", "csv", "pdf", "webp", "zip").' },
            outputRelativePath: { type: 'string', description: 'Optional output file path relative to workspace root. Defaults next to input file.' },
            category: {
              type: 'string',
              description: 'Optional converter category override.',
              enum: ['video', 'audio', 'images', 'documents', 'spreadsheets', 'archives'],
            },
            saveOutput: { type: 'boolean', description: 'When true (default), writes the converted file inside OMNIDESK_WORKSPACE_DIR.' },
          },
          required: ['inputRelativePath', 'targetFormat'],
        },
      },
    ]
  : [];

const SERVER_LOCAL_TOOLS = [BRIDGE_STATUS_TOOL, ...LOCAL_FS_TOOLS];

function resolveSafeWorkspacePath(relativePath) {
  if (!WORKSPACE_ROOT) {
    throw new Error('OMNIDESK_WORKSPACE_DIR is not configured.');
  }
  const clean = String(relativePath || '.').replace(/\0/g, '');
  const resolved = path.resolve(WORKSPACE_ROOT, clean);
  if (resolved !== WORKSPACE_ROOT && !resolved.startsWith(WORKSPACE_ROOT + path.sep)) {
    throw new Error('Access denied: path escapes configured workspace directory.');
  }
  return resolved;
}

async function runLocalTool(name, args) {
  if (name === 'omnidesk_bridge_status') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              connected: Boolean(activeDesktopSocket && activeDesktopSocket.readyState === activeDesktopSocket.OPEN),
              authenticated: socketAuthenticated,
              bridgeUrl: `ws://${WS_HOST}:${WS_PORT}/bridge`,
              tokenRequired: Boolean(BRIDGE_TOKEN),
              workspaceDirConfigured: Boolean(WORKSPACE_ROOT),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === 'workspace_list_files') {
    const dirPath = resolveSafeWorkspacePath(args?.relativeDir || '.');
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify({ root: WORKSPACE_ROOT, items }, null, 2) }],
    };
  }

  if (name === 'workspace_read_text_file') {
    const filePath = resolveSafeWorkspacePath(args?.relativePath);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error('Target path is not a regular file.');
    }
    if (stat.size > 512 * 1024) {
      throw new Error('File exceeds 512 KB read limit.');
    }
    const content = await fs.readFile(filePath, 'utf8');
    return {
      content: [{ type: 'text', text: content }],
    };
  }

  if (name === 'workspace_convert_file') {
    const inputPath = resolveSafeWorkspacePath(args?.inputRelativePath);
    const targetFormat = String(args?.targetFormat || '')
      .trim()
      .toLowerCase()
      .replace(/^\./, '');
    if (!targetFormat || !/^[a-z0-9]{1,10}$/.test(targetFormat)) {
      throw new Error('targetFormat must be a valid alphanumeric extension (e.g. "html", "json", "pdf").');
    }

    const stat = await fs.stat(inputPath);
    if (!stat.isFile()) {
      throw new Error('inputRelativePath is not a regular file.');
    }
    const maxBytes = 5 * 1024 * 1024;
    if (stat.size > maxBytes) {
      throw new Error('File exceeds 5 MB conversion limit.');
    }

    const rawBytes = await fs.readFile(inputPath);
    const bridgeRes = await forwardToDesktopBridge(
      'tools/call',
      {
        name: 'convert_file_base64',
        arguments: {
          fileName: path.basename(inputPath),
          base64Content: rawBytes.toString('base64'),
          targetFormat,
          category: typeof args?.category === 'string' ? args.category : undefined,
        },
      },
      25000
    );

    if (bridgeRes.error) {
      throw new Error(bridgeRes.error.message || 'OmniDesk bridge conversion error.');
    }
    if (bridgeRes.result?.isError) {
      const errText = bridgeRes.result?.content?.[0]?.text || 'Conversion failed.';
      throw new Error(errText);
    }

    const payloadText = bridgeRes.result?.content?.[0]?.text;
    const parsed = JSON.parse(payloadText);
    const outBuffer = Buffer.from(parsed.base64Output || '', 'base64');
    if (outBuffer.byteLength > 20 * 1024 * 1024) {
      throw new Error('Converted output exceeds maximum allowed size (20 MB).');
    }

    let savedRelativePath = null;
    if (args?.saveOutput !== false) {
      const defaultOutRel = path.join(
        path.dirname(String(args.inputRelativePath)),
        parsed.fileName || `${path.parse(inputPath).name}.${targetFormat}`
      );
      const outputPath = resolveSafeWorkspacePath(args?.outputRelativePath || defaultOutRel);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, outBuffer);
      savedRelativePath = path.relative(WORKSPACE_ROOT, outputPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              inputRelativePath: path.relative(WORKSPACE_ROOT, inputPath),
              outputRelativePath: savedRelativePath,
              fileName: parsed.fileName,
              category: parsed.category,
              mime: parsed.mime,
              originalSize: parsed.originalSize,
              newSize: parsed.newSize,
              durationMs: parsed.durationMs,
              textPreview: parsed.textPreview,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown local server tool: ${name}`);
}

// ── 2. Loopback WebSocket Bridge to OmniDesk Desktop App ─────────────────────
const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT, path: '/bridge' });

wss.on('connection', ws => {
  if (activeDesktopSocket && activeDesktopSocket.readyState === activeDesktopSocket.OPEN) {
    activeDesktopSocket.close(1000, 'Replaced by newer OmniDesk connection');
  }

  activeDesktopSocket = ws;
  socketAuthenticated = !BRIDGE_TOKEN;
  if (socketAuthenticated) {
    notifyToolsAndResourcesChanged();
  }

  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }

    // Handle optional authentication handshake sent by WebSocketMcpTransport
    if (msg.method === 'omnidesk/authenticate') {
      const provided = typeof msg.params?.token === 'string' ? msg.params.token.trim() : '';
      if (BRIDGE_TOKEN && provided !== BRIDGE_TOKEN) {
        ws.close(1008, 'Invalid MCP bridge authentication token');
        return;
      }
      socketAuthenticated = true;
      notifyToolsAndResourcesChanged();
      return;
    }

    // Resolve pending request forwarded to the OmniDesk WebView
    if (msg.id !== undefined && pendingBridgeRequests.has(msg.id)) {
      const { resolve, timer } = pendingBridgeRequests.get(msg.id);
      clearTimeout(timer);
      pendingBridgeRequests.delete(msg.id);
      resolve(msg);
    }
  });

  ws.on('close', () => {
    if (activeDesktopSocket === ws) {
      activeDesktopSocket = null;
      socketAuthenticated = !BRIDGE_TOKEN;
      for (const [id, pending] of pendingBridgeRequests.entries()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('OmniDesk desktop bridge disconnected.'));
        pendingBridgeRequests.delete(id);
      }
      notifyToolsAndResourcesChanged();
    }
  });
});

function forwardToDesktopBridge(method, params = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!activeDesktopSocket || activeDesktopSocket.readyState !== activeDesktopSocket.OPEN) {
      reject(new Error('OmniDesk desktop app is not connected to the MCP bridge.'));
      return;
    }
    if (!socketAuthenticated) {
      reject(new Error('OmniDesk desktop bridge has not completed token authentication.'));
      return;
    }

    const id = `bridge-${bridgeRequestCounter++}`;
    const timer = setTimeout(() => {
      pendingBridgeRequests.delete(id);
      reject(new Error(`OmniDesk bridge request timed out (${method}).`));
    }, timeoutMs);

    pendingBridgeRequests.set(id, { resolve, reject, timer });
    activeDesktopSocket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      })
    );
  });
}

// ── 3. Stdio JSON-RPC 2.0 Server for External AI Clients ─────────────────────
function writeStdio(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function handleStdioRequest(req) {
  const hasId = req.id !== undefined;

  if (req.method === 'notifications/initialized') {
    clientInitialized = true;
    return;
  }

  if (req.method === 'ping') {
    if (hasId) writeStdio({ jsonrpc: '2.0', id: req.id, result: {} });
    return;
  }

  if (req.method === 'initialize') {
    clientInitialized = true;
    if (hasId) {
      writeStdio({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true },
          },
          serverInfo: {
            name: 'omnidesk-mcp-server',
            version: '0.1.14',
          },
        },
      });
    }
    return;
  }

  if (req.method === 'tools/list') {
    try {
      let desktopTools = [];
      if (activeDesktopSocket && socketAuthenticated) {
        const bridgeRes = await forwardToDesktopBridge('tools/list');
        if (!bridgeRes.error && Array.isArray(bridgeRes.result?.tools)) {
          desktopTools = bridgeRes.result.tools;
        }
      }
      if (hasId) {
        writeStdio({
          jsonrpc: '2.0',
          id: req.id,
          result: { tools: [...desktopTools, ...SERVER_LOCAL_TOOLS] },
        });
      }
    } catch {
      if (hasId) {
        writeStdio({
          jsonrpc: '2.0',
          id: req.id,
          result: { tools: SERVER_LOCAL_TOOLS },
        });
      }
    }
    return;
  }

  if (req.method === 'tools/call') {
    const name = req.params?.name;
    const args = req.params?.arguments || {};

    try {
      if (SERVER_LOCAL_TOOLS.some(tool => tool.name === name)) {
        const result = await runLocalTool(name, args);
        if (hasId) writeStdio({ jsonrpc: '2.0', id: req.id, result });
        return;
      }

      const timeoutMs = name === 'convert_file_base64' ? 25000 : 8000;
      const bridgeRes = await forwardToDesktopBridge('tools/call', { name, arguments: args }, timeoutMs);
      if (hasId) {
        if (bridgeRes.error) {
          writeStdio({ jsonrpc: '2.0', id: req.id, error: bridgeRes.error });
        } else {
          writeStdio({ jsonrpc: '2.0', id: req.id, result: bridgeRes.result });
        }
      }
    } catch (err) {
      if (hasId) {
        writeStdio({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            isError: true,
            content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
          },
        });
      }
    }
    return;
  }

  if (req.method === 'resources/list' || req.method === 'resources/read') {
    try {
      if (req.method === 'resources/list' && (!activeDesktopSocket || !socketAuthenticated)) {
        if (hasId) writeStdio({ jsonrpc: '2.0', id: req.id, result: { resources: [] } });
        return;
      }
      const bridgeRes = await forwardToDesktopBridge(req.method, req.params || {});
      if (hasId) {
        if (bridgeRes.error) {
          writeStdio({ jsonrpc: '2.0', id: req.id, error: bridgeRes.error });
        } else {
          writeStdio({ jsonrpc: '2.0', id: req.id, result: bridgeRes.result });
        }
      }
    } catch (err) {
      if (hasId) {
        writeStdio({
          jsonrpc: '2.0',
          id: req.id,
          error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
        });
      }
    }
    return;
  }

  if (hasId) {
    writeStdio({
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    });
  }
}

function shutdown() {
  for (const [id, pending] of pendingBridgeRequests.entries()) {
    clearTimeout(pending.timer);
    pendingBridgeRequests.delete(id);
  }
  try {
    activeDesktopSocket?.close(1000, 'Server shutting down');
  } catch {
    // ignore
  }
  wss.close(() => {
    process.exit(0);
  });
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const req = JSON.parse(trimmed);
    void handleStdioRequest(req);
  } catch {
    writeStdio({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: invalid JSON.' },
    });
  }
});

rl.on('close', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

wss.on('listening', () => {
  const address = wss.address();
  const actualPort = typeof address === 'object' && address ? address.port : WS_PORT;
  process.stderr.write(
    `[omnidesk-mcp] Listening for OmniDesk WebSocket bridge at ws://${WS_HOST}:${actualPort}/bridge\n`
  );
});
