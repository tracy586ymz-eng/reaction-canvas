# Validation and limits

The initial MVP was checked locally on Apple Silicon macOS. Evidence describes engineering behavior, not scientific prediction accuracy.

- TypeScript/Vite production build and Rust compilation/Clippy passed.
- Six domain tests and four Rust boundary tests passed.
- Browser interaction checks covered drafts, image staging, IME Enter, cancellation, stale results, history backup/restore, and compact layout. Native capture is replaced by a test bridge in those checks.
- Eight molecules matched upstream RDKit across five methods after the CSP binding change (validity, canonical SMILES, JSON, descriptors, SVG). This does not cover every RDKit API.
- Native Mac launch, local drawing, clipboard copy and PNG save were exercised. A loopback fixed-fixture service exercised model discovery and text/image requests; no real-provider chemistry evaluation was performed.
- Native screenshot cancellation was exercised. Successful region capture, multiple displays and OS capture permissions still require full testing.
- macOS universal source/build exists; Intel hardware was not tested. Windows source and NSIS workflow exist; Windows runtime/install validation is pending. Linux is outside this MVP's support.

At the recorded dependency audit, npm reported zero known vulnerabilities; RustSec's vulnerability list was empty with notices for unmaintained proc-macro-error and glib 0.18.5 soundness. Reverse dependency checks on macOS/Windows found those notices only on inactive Linux GTK lockfile paths. This is a dated scan, not an absolute security claim; rerun audits as dependencies change.

Chemical limits: no measured reaction-feasibility accuracy, no automatic evidence retrieval, no independent OCSR engine, no complete atom/mass balance verification, no editable molecular canvas, no PDF import or automatic local-model installation. Generic models can misread structure, omit conditions or hallucinate products. An unsupported/unknown answer is not evidence that two substances cannot react.

Before experimentally acting on a candidate, independently verify structures, context, literature and safe procedure with qualified domain expertise. Do not use this MVP as a laboratory safety decision system.
