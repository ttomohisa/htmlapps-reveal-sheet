# Reveal Sheet v0.9.0 release-candidate QA matrix

This matrix separates automated evidence from physical-device/manual evidence. A configured input ceiling is a rejection rule, not a guarantee that every device can process data at that ceiling.

## T17 — network, CSP and hostile input

| Check | Path | Status before CI |
|---|---|---|
| Lesson executable runtime SHA-256 matches CSP | `tests/e2e/network-security.spec.mjs` | Pending branch CI |
| Post-initial-document HTTP(S) requests are zero | HTTP-served app + lesson direct-file | Pending branch CI |
| Hostile outer HTML is not executed/adopted | lesson re-import | Pending branch CI |
| Oversized HTML rejected before reading | `tests/unit/security-contract.test.mjs` | Pending branch CI |
| Script/style/SVG terminators remain data | unit + browser regression | Pending branch CI |
| Readable/root copy/self-extract restoration | repository/template checks | Pending branch CI |

## T18 — resource, recovery and device/startup paths

| Check | Path | Status before CI |
|---|---|---|
| 10 pages / 100 questions repeated round-trip | browser release-candidate suite | Pending branch CI |
| 30 pages / 1000 covers boundary | unit + browser observation | Pending branch CI |
| Over-limit import preserves current work | browser release-candidate suite | Pending branch CI |
| PC Chromium `file://` readable / self-extract | existing full E2E matrix | Pending branch CI |
| PC Chromium HTTP startup | network-security suite | Pending branch CI |
| Physical Windows Edge file / HTTPS | Manual | Unperformed |
| Physical Android Chrome | Manual | Unperformed |
| Physical iPhone Safari | Manual | Unperformed |
| Real screen reader / 200% browser zoom | Manual | Unperformed |
| Background / screen lock on physical phone | Manual | Unperformed |
| OS save-cancel / file hand-off behavior | Manual | Unperformed |

Automated viewport or browser emulation is not recorded as physical-device completion. See `docs/MOBILE_ACCESSIBILITY_QA.md` for the separate accessibility/device checklist.
