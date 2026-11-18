# OmniDesk Desktop Auto-Updater & GitHub Releases Guide

OmniDesk's native **Tauri v2 Desktop** application supports cryptographically signed one-click updates powered by `tauri-plugin-updater` and **GitHub Releases**. Updates run exclusively in the Desktop app (`isTauri() === true`) and are omitted cleanly from the Web/PWA build.

---

## 1. How the Automated Update Flow Works

1. **Tag & CI Build (`vX.Y.Z`)**: When you push a release tag (e.g., `git tag v0.1.16 && git push origin v0.1.16`), `.github/workflows/release.yml` runs tests, i18n validation, Playwright E2E checks, and builds native Desktop installers across Windows, macOS, and Linux.
2. **Cryptographic Signing**: Each installer package is signed using your Ed25519 private signing key (`TAURI_SIGNING_PRIVATE_KEY`), producing `.sig` signature files and a unified **`latest.json`** updater manifest attached directly to the GitHub Release.
3. **Startup Check & Toast Notification**: When a user opens OmniDesk Desktop, `App.tsx` waits briefly after launch and calls `checkForDesktopUpdate()` against:
   `https://github.com/LeonidCharikov/OmniDesk/releases/latest/download/latest.json`
   If a newer version exists, a non-blocking toast invites the user to open **Settings → Updates**.
4. **One-Click Install & Relaunch**: In **Settings → Updates**, the user reviews the version and release notes, clicks **Download & Install**, watches real-time download progress, and Tauri verifies the Ed25519 signature before installing and relaunching automatically via `tauri-plugin-process`.

> **Safe Fallback**: If signing keys have not been configured yet in CI or `tauri.conf.json`, the app never crashes or panics — `src-tauri/src/lib.rs` detects an empty public key cleanly and **Settings → Updates** displays a clear status banner explaining how to enable signed updates.

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

## 4. Publishing a New Auto-Update Release

1. Bump the version consistently in:
   - `package.json` (`"version": "0.1.16"`)
   - `src-tauri/tauri.conf.json` (`"version": "0.1.16"`)
   - `src-tauri/Cargo.toml` (`version = "0.1.16"`)
2. Commit and push to `main`:
   ```bash
   git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
   git commit -m "chore(release): bump version to v0.1.16"
   git push origin main
   ```
3. Create and push the matching `v*` tag:
   ```bash
   git tag v0.1.16
   git push origin v0.1.16
   ```
4. `.github/workflows/release.yml` automatically compiles Windows/macOS/Linux bundles, signs them, uploads `.sig` + installer artifacts + `latest.json`, and publishes the GitHub Release.
5. Verify that `https://github.com/LeonidCharikov/OmniDesk/releases/latest/download/latest.json` downloads valid JSON with `"version": "0.1.16"` and signed `platforms` entries.
