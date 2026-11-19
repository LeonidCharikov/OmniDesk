# OmniDesk Desktop Auto-Updater & GitHub Releases Guide

OmniDesk's native **Tauri v2 Desktop** application supports cryptographically signed one-click updates powered by `tauri-plugin-updater` and **GitHub Releases**. Updates run exclusively in the Desktop app (`isTauri() === true`) and are omitted cleanly from the Web/PWA build.

---

## 1. How the Automated Update Flow Works

1. **Controlled Desktop Releases (On-Demand or Tag)**: Regular commits pushed to `main` update the **Web/PWA** app automatically (`pages.yml`) without spamming Desktop users. When you are ready to ship a batch of changes to Desktop, trigger **Actions → Build and release OmniDesk → Run workflow** (or push a `vX.Y.Z` tag). The workflow runs tests, i18n validation, Playwright E2E checks, and builds native Desktop installers across Windows, macOS, and Linux.
2. **Cryptographic Signing**: Each installer package is signed using your Ed25519 private signing key (`TAURI_SIGNING_PRIVATE_KEY`), producing `.sig` signature files and a unified **`latest.json`** updater manifest attached directly to the GitHub Release.
3. **Startup Check & Toast Notification**: When a user opens OmniDesk Desktop, `App.tsx` waits briefly after launch and calls `checkForDesktopUpdate()` against:
   `https://github.com/LeonidCharikov/OmniDesk/releases/latest/download/latest.json`
   If a newer version exists, a non-blocking toast and a top-bar / sidebar **Update** button invite the user to update.
4. **One-Click Install & Relaunch**: Clicking the update button (or opening **Settings → Updates** and clicking **Download & Install**) streams download progress, verifies the Ed25519 signature, installs the update, and relaunches automatically via `tauri-plugin-process`.

> **Safe Fallback**: If signing keys have not been configured yet in CI or `tauri.conf.json`, the app never crashes or panics — `src-tauri/src/lib.rs` detects an empty public key cleanly and falls back to checking GitHub Releases with a direct installer download link.

---

## 2. One-Time Setup: Generate Tauri Signing Keys

Run the official Tauri CLI key generator locally:

```bash
npx tauri signer generate -w ~/.tauri/omnidesk.key
```

This creates two values:
- **Private Key** (`~/.tauri/omnidesk.key` contents) — keep secret! Never commit to Git.
- **Public Key** (`~/.tauri/omnidesk.key.pub` or printed in stdout) — safe to embed in public builds.

---

## 3. Configure GitHub Repository Secrets & Variables

In your GitHub repository go to **Settings → Secrets and variables → Actions**:

1. Under **Secrets → Repository secrets**, add:
   - **`TAURI_SIGNING_PRIVATE_KEY`**: Paste the entire contents of `~/.tauri/omnidesk.key`.
   - **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`** *(if you entered a password when generating the key; omit or leave blank if none)*.
2. Under **Variables → Repository variables** *(recommended)* or **Secrets**, add:
   - **`TAURI_SIGNING_PUBLIC_KEY`**: Paste the contents of `~/.tauri/omnidesk.key.pub`.

*(Alternatively, you can paste the public key directly into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.)*

---

## 4. Publishing a New Desktop Release

You do not need to edit `package.json`, `src-tauri/tauri.conf.json`, or `src-tauri/Cargo.toml` manually.

### Method A — From GitHub UI (Recommended)
1. Push your normal commits to `main` as usual (Web/PWA deploys automatically).
2. When you are ready to ship a Desktop update, open **GitHub → Actions → Build and release OmniDesk → Run workflow**.
3. Choose:
   - **Version bump**: `patch` (e.g. `0.1.18` → `0.1.19`), `minor` (`0.2.0`), or `major` (`1.0.0`).
   - **Optional exact version**: leave empty to auto-bump, or enter e.g. `0.2.0`.
   - **Optional release notes**: short summary shown inside OmniDesk **Settings → Updates**.
4. Click **Run workflow**. CI runs tests once, builds signed Windows/macOS/Linux installers + unified `latest.json` into a draft release, and publishes it atomically when all platforms finish.

### Method B — From Terminal with a Git Tag
```bash
git tag v0.1.19
git push origin v0.1.19
```

Verify in the GitHub Actions job summary that **Signed In-App Auto-Updater (`latest.json`)** shows **Enabled**, and that `https://github.com/LeonidCharikov/OmniDesk/releases/latest/download/latest.json` downloads valid JSON with signed `platforms` entries.
