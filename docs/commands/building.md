# Building

Production builds and cross-platform desktop binaries.

---

## Standard Builds

| Command | What it does |
|---|---|
| `make build` | Build all apps via Turborepo |
| `make build-admin` | Next.js production build |
| `make build-desktop` | Tauri build for the current host platform |

---

## Desktop Cross-Platform Builds

Tauri compiles native binaries. Each target produces release-ready installers.

| Command | Target | Output |
|---|---|---|
| `make desktop-mac` | macOS ARM64 (Apple Silicon) | `.app` + `.dmg` |
| `make desktop-mac-intel` | macOS x86_64 (Intel) | `.app` + `.dmg` |
| `make desktop-mac-universal` | macOS Universal (ARM + Intel) | `.app` + `.dmg` |
| `make desktop-windows` | Windows x64 | `.exe` NSIS + `.msi` |
| `make desktop-linux` | Linux x86_64 | `.AppImage` + `.deb` |
| `make desktop-all` | All platforms in sequence | All of the above |

Artifacts land in `apps/desktop/src-tauri/target/<triple>/release/bundle/`.

### macOS Universal (no extra setup)

```bash
make setup-rust             # adds required rustup targets
make desktop-mac-universal  # produces ARM + Intel combined binary
```

### macOS → Windows (cross-compilation)

Requires `xwin` and LLVM linker. Alternative: use CI (GitHub Actions on `windows-latest`).

```bash
brew install llvm
cargo install xwin
xwin --accept-license splat --output ~/.xwin
rustup target add x86_64-pc-windows-msvc
make desktop-windows
```

### macOS → Linux (cross-compilation)

Recommended path is CI (GitHub Actions on `ubuntu-22.04`) since Linux builds need GTK/WebKit2GTK headers.

```bash
# Using cross (Docker-based):
cargo install cross --git https://github.com/cross-rs/cross
cd apps/desktop/src-tauri
cross build --release --target x86_64-unknown-linux-gnu
```

### CI Matrix

```yaml
strategy:
  matrix:
    include:
      - os: macos-14        # Apple Silicon — make desktop-mac-universal
      - os: windows-latest  # make desktop-windows
      - os: ubuntu-22.04    # make desktop-linux
```

---

## Device Testing Builds

Build the desktop app configured to hit a specific API URL (useful for sharing test builds).

| Command | What it does |
|---|---|
| `make build-mac` | Build macOS installer using `NGROK_STATIC_DOMAIN` from `.env` |
| `make build-mac-url` | Build macOS installer with a prompted custom API URL |
| `make build-mac-local` | Build macOS installer pointing at `localhost:8000` |
| `make open-builds` | Open `dist/installers/` in Finder |
| `make serve-builds` | Serve installers over HTTP on your LAN |
| `make serve-builds-port PORT=8080` | Serve builds on a custom port |
| `make release-draft` | Build macOS + create a GitHub draft release |

---

## Build Artifact Locations

```
apps/desktop/src-tauri/target/
├── aarch64-apple-darwin/release/bundle/
│   ├── macos/    → SecureAssess.app
│   └── dmg/      → SecureAssess_*.dmg
├── x86_64-apple-darwin/release/bundle/
├── universal-apple-darwin/release/bundle/
├── x86_64-pc-windows-msvc/release/bundle/
│   ├── nsis/     → SecureAssess_*_x64-setup.exe
│   └── msi/      → SecureAssess_*_x64_en-US.msi
└── x86_64-unknown-linux-gnu/release/bundle/
    ├── appimage/ → SecureAssess_*.AppImage
    └── deb/      → SecureAssess_*.deb
```
