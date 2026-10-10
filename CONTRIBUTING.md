# Contributing

Small, reproducible contributions are welcome. Start with an issue describing the user problem, expected behavior and a synthetic example. Current priorities are in docs/ROADMAP.md. Keep the UI simple; users should not need to classify chemistry before asking.

## Local setup and checks

See source/desktop/BUILD.md. Run npm test and npm run build in source/desktop; run cargo test and cargo clippy --all-targets -- -D warnings in src-tauri for native changes. Desktop integration checks need a local Vite server and a Playwright browser. Their fixtures never require an actual AI key. Update validation notes if behavior changes; keep scientific conclusions separate from engineering tests.

## Pull requests

Use a separate branch. Explain the problem and resulting behavior, include relevant validation, and keep the change focused. Screenshots must use the built-in example or synthetic data. Never commit .env files, keys, provider call logs, task backups, customer images, private endpoints or personal memory notes. Do not loosen CSP or redirect/credential boundaries to make a provider work. Retain dependency notices and check model weight licenses separately from code licenses.

Participation should be respectful. Avoid harassment, spam and fabricated benchmark claims. By contributing, you offer your original contribution under this project's MIT license; third-party material must carry its compatible original license and attribution.
