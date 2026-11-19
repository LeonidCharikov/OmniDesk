# OmniDesk Model Context Protocol (MCP) Server Implementation Guide

This guide describes how to integrate an external AI assistant (such as **Claude Desktop**, **Cursor**, **VS Code**, or a custom agent) with the **OmniDesk** desktop application using the **Model Context Protocol (MCP)**.

---

## 1. Architecture Overview

OmniDesk is a dual-runtime **Tauri v2 + React** desktop workstation:

- **React WebView (`src/`)** owns user workspace data such as Calendar events, Daily Tasks, Kanban cards, Notes, and tool navigation.
- **Rust Tauri Backend (`src-tauri/src/lib.rs`)** owns native OS capabilities such as `get_system_telemetry` (`sysinfo`), native file dialogs (`tauri-plugin-dialog`), and host filesystem access (`tauri-plugin-fs`).

Because external AI hosts communicate with local MCP servers over **stdio** (or loopback HTTP/WebSocket) rather than directly reading WebView `localStorage`, OmniDesk provides a built-in client bridge module (`src/services/mcpClient.ts`) that connects the desktop app to a local MCP server:

```
┌──────────────────────┐   stdio (JSON-RPC 2.0)   ┌───────────────────────────────┐
│  AI Host / Assistant │ ◄──────────────────────► │  Node.js MCP Server           │
│  (Claude, Cursor)    │                          │  (docs/mcp-server-template)   │
└──────────────────────┘                          └──────────────┬────────────────┘
                                                                 │
                                     ws://127.0.0.1:3847/bridge  │  Scoped FS
                                     (JSON-RPC 2.0 + Auth Token) │  (OMNIDESK_WORKSPACE_DIR)
                                                                 ▼
                                                  ┌───────────────────────────────┐
                                                  │  OmniDesk Desktop (Tauri v2)  │
                                                  │  • src/services/mcpClient.ts  │
                                                  │  • Calendar / Tasks / Notes   │
                                                  │  • invoke('get_system_telemetry')
                                                  └───────────────────────────────┘
```

### Supported Client Transports in `src/services/mcpClient.ts`

1. **`WebSocketMcpTransport` (`transport: "websocket"`)** — Connects from OmniDesk to a local WebSocket relay (`ws://127.0.0.1:3847/bridge` or `ws://localhost:...`) with optional `omnidesk/authenticate` token verification. Non-loopback URLs are rejected by `isValidMcpWebSocketUrl()`.
2. **`StdioIpcMcpTransport` (`transport: "stdio"`)** — Bridges JSON-RPC messages over Tauri IPC (`omnidesk:mcp-stdio-rx` events and `mcp_stdio_tx` Rust command) for native stdio integration when embedded directly in the Rust binary.

---

## 2. Exposed Local File System & Internal Tool APIs

### A. Internal OmniDesk Workspace & System APIs (`src/services/mcpClient.ts`)

All tools respect OmniDesk’s **Permission Level** (`readonly` vs `readwrite`).

| Tool Name | Mode | Source / Tauri Integration | Capabilities & Parameters |
| :--- | :--- | :--- | :--- |
| `calendar_list_events` | `readonly` | `localStorage` (`omnidesk_calendar_events`) | List calendar events filtered by `dateFrom` (`YYYY-MM-DD`), `dateTo`, and `query`. |
| `calendar_create_event` | `readwrite` | `localStorage` + `omnidesk-calendar-updated` event | Create an event (`date`, `hour`, `minute`, `durationMinutes`, `title`, `description`, `color`, `recurrence`). |
| `calendar_delete_event` | `readwrite` | `localStorage` + `omnidesk-calendar-updated` event | Delete an event by `id`. |
| `tasks_list` | `readonly` | `UserConfig.widgets.dailyTasks` + `omnidesk-kanban-board-v2` | Return sidebar daily tasks and Kanban board cards (`scope`: `all` \| `daily` \| `kanban`). |
| `tasks_create` | `readwrite` | `saveUserConfig` / Kanban storage | Add a daily task or Kanban card (`target`, `text`, `column`, `priority`). |
| `tasks_update_status` | `readwrite` | `saveUserConfig` / Kanban storage | Toggle daily task completion (`done`) or move Kanban card (`todo` \| `doing` \| `done`). |
| `notes_search` | `readonly` | `localStorage` (`omnidesk-notes`) | Search or list local notes by `query`. |
| `notes_create` | `readwrite` | `localStorage` + `omnidesk-notes-updated` event | Create a note (`title`, `body`). |
| `system_get_info` | `readonly` | Rust `get_system_telemetry` via `invokeRustCommand` | Return live CPU %, per-core usage, RAM used/total GB, disk used/total GB, uptime, and runtime metadata. |
| `app_list_tools` | `readonly` | `TOOLS_REGISTRY` summary | Discover internal OmniDesk tools by `category` or `query`. |
| `app_open_tool` | `readwrite` | `App.tsx` navigation handler | Focus and open a specific tool ID (e.g. `calendar`, `notes`, `pdf-editor`) in the desktop UI. |
| `clipboard_read` | `readonly` | Tauri `mcp_read_clipboard` / `navigator.clipboard` | Read current plain text content from the desktop or browser clipboard. |
| `clipboard_write` | `readwrite` | Tauri `mcp_write_clipboard` / `navigator.clipboard` | Write plain text content (`text`, max 100,000 chars) to the clipboard. |

### B. MCP Resources

- `omnidesk://calendar/events` — JSON snapshot of all saved calendar events.
- `omnidesk://tasks/summary` — Combined JSON snapshot of daily tasks and Kanban cards.
- `omnidesk://system/telemetry` — Live system telemetry and runtime metadata.

### C. Local File System APIs (Tauri & Scoped Server Directory)

OmniDesk separates **user-driven file dialogs** from **AI-accessible directories**:

1. **Scoped Workspace Directory (`OMNIDESK_WORKSPACE_DIR`)** in the Node.js MCP Server:
   - `workspace_list_files`: Lists entries inside `OMNIDESK_WORKSPACE_DIR` only.
   - `workspace_read_text_file`: Reads UTF-8 files up to 512 KB inside `OMNIDESK_WORKSPACE_DIR`, enforcing `path.resolve` prefix checks so `../` traversal is rejected.
2. **Tauri Native File System (`src/services/fileSystemService.ts` + `src-tauri/capabilities/default.json`)**:
   - `tauri-plugin-dialog` (`open`, `save`) and `tauri-plugin-fs` (`readTextFile`, `writeTextFile`, `readFile`, `writeFile`) are reserved for explicit user file selection and drag-and-drop inside the desktop UI.
   - **Never expose unrestricted `fs` read/write over MCP.** Always scope AI file tools to an explicit user-chosen folder (`OMNIDESK_WORKSPACE_DIR`) or `app_data_dir`.

### D. Intentionally Excluded APIs (Security Boundary)

To protect user privacy and workspace integrity, the following are **never** exposed over MCP:
- `securityService.ts` AES-GCM backup encryption keys and passphrases.
- Password Generator (`password-gen`), AES Cipher Studio (`aes-cipher-studio`), and arbitrary host shell/filesystem commands.

---

## 3. Running the Node.js MCP Server Template

A ready-to-run template is located in `docs/mcp-server-template/`:

```bash
cd docs/mcp-server-template
npm install
```

### Step 1: Configure OmniDesk Desktop App
1. Open **OmniDesk** → **Settings** (`ConfigModal`) → **MCP Bridge**.
2. Toggle **Enable MCP Bridge** on.
3. Choose **Transport Mode**: `WebSocket (Localhost)` with URL `ws://127.0.0.1:3847/bridge`.
4. Choose **Permission Level**: `Read-Only` (default) or `Read & Write`.
5. Optionally set a shared **Bridge Auth Token** (matching `OMNIDESK_MCP_TOKEN`).

### Step 2: Register with an MCP Client (e.g. Claude Desktop / Cursor)

Add the server to your MCP host configuration (for example `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "omnidesk": {
      "command": "node",
      "args": ["/ABS/PATH/TO/OmniDesk/docs/mcp-server-template/server.mjs"],
      "env": {
        "OMNIDESK_MCP_PORT": "3847",
        "OMNIDESK_MCP_TOKEN": "replace-with-your-local-secret",
        "OMNIDESK_WORKSPACE_DIR": "/ABS/PATH/TO/YOUR/OMNIDESK_FOLDER"
      }
    }
  }
}
```

> **Tip:** OmniDesk automatically retries loopback WebSocket connections with exponential backoff whenever **Enable MCP Bridge** is active, and `server.mjs` emits `notifications/tools/list_changed` & `notifications/resources/list_changed` as soon as OmniDesk connects. Use `omnidesk_bridge_status` to check connection state from an AI host, and open **Settings → MCP Bridge → MCP Log** in OmniDesk to inspect live JSON-RPC payloads and errors.

---

## 4. Built-In Rust Tauri `stdio` IPC & Background Clipboard

`src-tauri/` includes full native support for both **direct `stdio` IPC** and **background desktop clipboard access**:

1. **Direct `stdio` Transport (`src-tauri/src/lib.rs`)**:
   - A background `stdin` reader thread buffers early startup JSON-RPC lines until the WebView registers `omnidesk:mcp-stdio-rx` and invokes `mcp_stdio_ready`, preventing dropped `initialize` requests.
   - `mcp_stdio_tx(message)` writes newline-delimited JSON-RPC responses to `std::io::stdout()` and flushes immediately.
   - Launch with `--mcp-stdio` to suppress debug stdout logs when connecting an MCP host directly to the compiled Tauri desktop binary:
     ```json
     {
       "mcpServers": {
         "omnidesk-native": {
           "command": "/ABS/PATH/TO/OmniDesk",
           "args": ["--mcp-stdio"]
         }
       }
     }
     ```
     *(Switch **Settings → MCP Bridge → Transport Mode** to **Stdio (Tauri Desktop IPC)**.)*
2. **Background Clipboard Access (`tauri-plugin-clipboard-manager`)**:
   - Registered in `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`, and `src-tauri/src/lib.rs` via `mcp_read_clipboard` and `mcp_write_clipboard`.
   - Allows `clipboard_read` and `clipboard_write` to operate even when the OmniDesk desktop window is unfocused behind your AI client, falling back to `navigator.clipboard` in web/PWA mode.

---

## 5. End-to-End Verification

Run both the Node.js server template E2E suite and the Vitest full-stack MCP E2E suite:

```bash
npm --prefix docs/mcp-server-template test
npm test
```
