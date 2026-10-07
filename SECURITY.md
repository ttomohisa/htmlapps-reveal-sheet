# Security and privacy

Reveal Sheet v0.9.0 is a release-candidate development milestone. It accepts local JPEG, static PNG and static WebP images, validates format and resource bounds, and normalizes accepted images to PNG without resizing. Failed or hostile imports are rejected before replacing the current document.

## Runtime network boundary

The editor has no runtime CDN, external font, analytics, telemetry, advertising or external API dependency. The normal app uses a CSP with `connect-src 'none'`, and user images/data are processed in the browser.

Exported `.reveal.html` lessons contain a fixed executable runtime plus inert JSON lesson data. The build computes SHA-256 over the exact executable inline runtime and places the corresponding hash in the lesson CSP; lesson scripts do not use `'unsafe-inline'`. The lesson also blocks connections, frames, objects, media, workers, forms and external fonts.

The self-extracting wrapper is a separate trusted loader that restores the canonical readable HTML from its embedded gzip payload. Its CSP still permits the inline/blob mechanisms needed by that loader, while `connect-src 'none'` blocks runtime connections. Incoming user HTML is never passed to this loader.

## Incoming saved data and lesson HTML

Editable JSON and lesson HTML are treated as data, not trusted markup. Lesson re-import reads bytes as fatal UTF-8, locates exactly one fixed `reveal-sheet-data` JSON tag, validates depth/schema/references/resource limits and verifies embedded PNGs. Outer `script`, `style`, `img`, `iframe`, refresh markup and data-SVG markup are not inserted or executed. Unknown/newer schemas and malformed or oversized data are rejected atomically.

Exported editable data and lesson HTML exclude current learner ratings, Undo/Redo history, view state and original input filenames. Covers are study aids, not redaction or confidentiality controls; the underlying image pixels and answers remain in saved material.

## On-device persistence

Draft persistence and study-progress persistence are separate, opt-in features and are OFF by default. They use the Reveal Sheet IndexedDB namespace. Draft images/metadata and study records are separated; study progress does not duplicate image data. Generation checks prevent a stale tab from silently overwriting a newer committed draft. Quota, security and transaction failures leave manual editable-data export available.

Browser storage can be cleared by the browser/OS and is not permanent backup. Use `.reveal.json` for material that must be retained.

## Resource limits and reporting

Configured page/image/cover/file limits are safety rejection bounds, not guarantees that every device can process the maximum. Release-candidate observations and unperformed physical-device paths are recorded in `docs/QA_MATRIX.md` and `docs/QA_RESULTS.md`.

Only use files and materials you are authorized to use. Images can visibly contain private information even when metadata is not copied. If reporting a vulnerability, do not put private source images, credentials or personal information in a public issue; use a minimal synthetic reproduction where possible.
