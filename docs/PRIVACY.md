# Privacy and data flow

## What stays on your computer

- Keys: OS credential storage via keyring, scoped to the normalized service URL. They are not in workspace JSON, this repository, or the installer.
- Tasks, drafts, images and results: local application data. The OS-specific app-data directory contains the workspace and recovery backups. This app does not encrypt that history; protect your device and backup files.
- RDKit drawing and image export: local processing. Exported diagrams include generated content and uncertainty labels; review them before sharing.

## What is sent, and when

Fetching model choices sends an authenticated request to the configured provider. After you configure a model and consent, analysis sends the current task's text, attached/selected images and relevant conversation context to that provider. Successful screenshot capture initiates analysis, so only capture content you are allowed to transmit. The model sees the application system prompt as well. No unrelated desktop files, full screen stream or other tasks' history are intentionally collected.

Provider retention, training policies, security, quotas and pricing are outside this application's control. A local compatible endpoint is supported, but whether its server makes further network requests is your responsibility. Do not assume a service is free because of its ID. Stopping a request locally does not guarantee server cancellation.

## Current safeguards

Remote HTTPS; HTTP restricted to loopback; credential-scoped endpoints; URLs reject embedded credentials/query/fragment; redirects disabled; bounded image/context/response sizes; errors do not echo provider bodies or credentials; no embedded operator key; no built-in analytics or call-log upload. Images and model text are treated as input data. Strict CSP disables JavaScript eval; RDKit uses a version-pinned static binding adaptation.

These are implemented safeguards, not a guarantee against every leak or provider failure. The release build contains no customer task history or calls. Upstream license texts and public provider endpoint examples are not customer credentials.

## Sharing a bug

Use synthetic chemistry and dummy labels. Remove API keys, authorization headers, custom endpoint identifiers, request IDs, screenshots, model conversation bodies and personal file paths. Public GitHub issues are visible to anyone. Never upload the app-data directory or a full workspace backup to an issue. Report a suspected leak privately under SECURITY.md.
