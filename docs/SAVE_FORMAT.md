# Reveal Sheet save format

Reveal Sheet stores editable sheets and portable lesson HTML without sending user files to a server. This document describes the compatibility and validation contract for the current **schemaVersion 1** format.

## File types

| File | Purpose | Executed when reopened by Reveal Sheet? |
|---|---|---|
| `.reveal.json` | Editable sheet with normalized PNG images | No |
| `.reveal.html` | Self-contained study lesson | No. The editor reads only the fixed JSON data block as text. |

Both formats contain the normalized source images and covers. They are study/editing formats, not redaction formats.

## Envelope

Schema version 1 uses this envelope:

```json
{
  "format": "reveal-sheet",
  "schemaVersion": 1,
  "appVersion": "0.7.0",
  "kind": "editable",
  "document": {}
}
```

The parser uses an exact-key contract. Unknown structural keys are rejected. Strings may safely contain text such as `__proto__`, `constructor`, HTML-looking text, or script terminators; those strings are data and are not executed.

Future `schemaVersion` values are rejected with `UNSUPPORTED_SCHEMA`. Reveal Sheet does not guess-convert a format it does not understand.

## Format-1 compatibility

The compatibility contract is fixture-backed. Files saved by the format-1 milestones remain readable without dropping document data:

- v0.2.0 — editable image-embedded JSON
- v0.3.0 — page/group-compatible format 1
- v0.4.0 — guided-study defaults remain valid
- v0.5.0 — local persistence did not change the portable envelope
- v0.6.0 — portable lesson HTML uses the same embedded document contract
- v0.7.0 — strengthens validation and export state without changing schemaVersion

A later feature must not silently reinterpret an old schema-1 field. If a future feature cannot be represented without ambiguity, it requires an explicit format decision rather than a lossy fallback.

## Validation order

Editable JSON is handled as bytes and validated before it can replace the current sheet:

1. file-size limit
2. fatal UTF-8 decoding
3. JSON nesting-depth guard
4. JSON parse
5. envelope/schema version
6. exact structure and reference validation
7. embedded PNG byte/header/decode validation
8. only then, replacement confirmation

Lesson HTML follows a separate non-executing path:

1. HTML file-size limit
2. fatal UTF-8 decoding
3. locate exactly one fixed `<script id="reveal-sheet-data" type="application/json">` block
4. validate only that JSON payload as above
5. ignore the outer HTML rather than constructing it
6. only then, replacement confirmation

Incoming lesson HTML is not passed to `DOMParser`, `innerHTML`, `iframe.srcdoc`, `document.write`, or the trusted self-extract runtime.

## Structural invariants

Validation rejects, among other cases:

- duplicate IDs
- orphan images or references
- answer masks not owned by exactly one question
- groups whose masks cross page boundaries
- page question order that disagrees with the question set
- object values where an array is required
- unknown structural keys, including `__proto__` or `constructor`
- non-finite/out-of-range numeric values
- non-canonical or length-mismatched base64
- PNG metadata that disagrees with stored width/height/byte length
- APNG chunks in a stored `image/png`
- invalid UTF-8 or excessive JSON nesting

The same words remain allowed inside ordinary user text fields.

## Limits

Current safety limits are enforced both when creating a sheet and when reopening saved data.

| Item | Limit |
|---|---:|
| Pages | 30 |
| Covers total | 1,000 |
| Covers per page | 200 |
| Questions | 1,000 |
| Covers in one question | 50 |
| Input image | 20 MiB |
| Image side | 8,192 px |
| Image pixels | 16,000,000 |
| Normalized PNG | 32 MiB each |
| Embedded image bytes | 64 MiB total |
| Editable JSON | 96 MiB |
| Lesson HTML | 100 MiB |

Recognized resource-limit violations are reported as `LIMIT_EXCEEDED`; malformed structure is reported as `INVALID_SHEET`.

## Export lifecycle

v0.7.0 prepares an export against a specific document ID, document revision, and export generation. If the sheet changes while output is being prepared, that prepared result is invalidated and cannot start a download.

Starting a browser download is not treated as proof that the operating system finished saving the file. The UI therefore reports **save started**, not **save completed**.

Preview sessions remain isolated from the author’s current/saved study progress, and exported lesson/editable data do not include personal study results, Undo history, view state, or original input filenames.
