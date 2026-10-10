# First use / 首次使用

## Installation

Use this repository's Releases page for published binaries. macOS: open the DMG and drag Reaction Canvas into Applications. The experimental Mac build is ad-hoc signed and is not notarized; customer-machine installation is not certified. Do not disable system security globally. Windows binaries will be marked experimental until native installation/capture tests are complete. The source build workflow is available today.

## Offline demo

Open the application and click **体验示例（不联网）**. It draws a fixed acetic-acid/ethanol example locally, without accessing your model service. This is a UI demo, not a model prediction.

## Connect your own AI

1. Open **设置**. Choose SiliconFlow or your existing OpenAI-compatible endpoint.
2. Enter your own key in the app, and connect to fetch the model list. HTTP is allowed only for loopback/local services; remote services require HTTPS.
3. Choose a model. Confirm its current price with the provider; for screenshots, confirm that it accepts images. The app does not infer free access from a model name.
4. Read and confirm the transmission setting, then save.
5. Ask a text question, upload a structure image, or press `⌘/Ctrl + Shift + Space` to capture a region. macOS screen-recording permission may be required; grant it through the OS only if you want capture.

The app sends the current task context to the selected provider. Follow provider terms and your organization's rules for patents or confidential chemistry. No account credits or free quotas are included.

## Everyday actions

Upload/paste/drag stages an image until **发送**. A successful shortcut capture starts analysis with a configured service; Escape cancels selection. **继续讨论** expands the same task. Enter sends, Shift+Enter inserts a line, Chinese IME composition does not submit. Use **复制图** or SVG/PNG export after inspecting structures and conditions. Settings contains **本机历史与恢复** for workspace backup and restore; restoring preserves current service settings.

## Troubleshooting

A provider must return usable structured results. A text-only model cannot analyze images. Rate limits, malformed results and missing conditions produce an actionable message rather than an automatic provider switch. Check the model and endpoint, then retry. Cancelling stops local waiting; it may not cancel processing or billing at the provider.

For an issue, provide app/platform versions and a synthetic reproduction. Never include keys, full request/response bodies, proprietary screenshots or unreviewed logs. See SECURITY.md and docs/PRIVACY.md.
