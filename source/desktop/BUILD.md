# Build and restore

End users only install the application; no Node, Rust, Python or dedicated GPU is required. Developers need Node 24, Rust stable, and native tools: Xcode Command Line Tools on macOS; Visual Studio C++ Build Tools and WebView2 on Windows.

```sh
npm ci
node scripts/generate-notices.mjs
npm test
npm run tauri -- dev
```

The pinned RDKit.js version is 2026.03.6. prepare-rdkit.mjs adapts two Emscripten JavaScript invoker factories to static bindings while leaving WASM unchanged and retaining a strict CSP. Review and rerun upstream comparisons before upgrading; do not blindly reuse that patch with a new loader.

## Installers

macOS universal: rustup target add x86_64-apple-darwin, then npm run tauri -- build --target universal-apple-darwin --bundles app. The initial local test build is ad-hoc signed, not notarized. Windows native: scripts/build-windows.ps1 builds NSIS. The repository contains a manually triggered build workflow; download artifacts only after checking its result. Building Windows does not prove native capture/install behavior.

```sh
npm run dev
# Separate terminal, same directory; choose an installed Playwright browser if needed
node tests/desktop-flows.cjs
node tests/rdkit-bindings.cjs
cd src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
```

License texts are generated from installed locked dependencies and included as bundle resources. Regenerate them after dependency updates. Generated RDKit files, target/, dist/, licenses dependency folders and work/ are rebuildable and excluded from Git. Browser tests use fixed fixtures; no real model key is required. Test outputs are written to the repository's ignored work/ directory.

Runtime task history lives in the system app-data directory for com.tracy.reactioncanvas; credentials remain in the OS store, separately scoped per service. Restoring history keeps current service settings. Never include app data, call logs or credentials in an installer.
