# Reveal Sheet v0.9.0 release-candidate QA matrix

This matrix separates automated evidence from physical-device/manual evidence. A configured input ceiling is a rejection rule, not a guarantee that every device can process data at that ceiling.

Automated evidence below is from application source commit `527f2d9a02f8200f2e93cefe819542b901890bc2`: application workflow `37582287340`, standalone workflow `37582287373`, preview workflow `37582287356`. The application run produced QA artifact `reveal-qa-527f2d9a02f8200f2e93cefe819542b901890bc2` (ID `11465390311`).

## T17 — network, CSP and hostile input

| Check | Path | Result |
|---|---|---|
| Lesson executable runtime SHA-256 matches CSP | `tests/e2e/network-security.spec.mjs` | Passed in readable + self-extract |
| Post-initial-document HTTP(S) requests are zero | HTTP-served app + lesson direct-file | Passed in readable + self-extract |
| Hostile outer HTML is not executed/adopted | lesson re-import | Passed in readable + self-extract |
| Oversized HTML rejected before reading | `tests/unit/security-contract.test.mjs` | Passed |
| Script/style/SVG terminators remain data | unit + browser regression | Passed |
| Disguised stored image payload is rejected atomically | browser regression | Passed |
| Readable/root copy/self-extract restoration | repository/template checks | Passed |
| Lesson runtime hash metadata and CSP use the same exact code | browser recomputation | Passed |

## T18 — resource, recovery and device/startup paths

| Check | Path | Result |
|---|---|---|
| 10 pages / 100 questions repeated round-trip | browser release-candidate suite | Passed in readable + self-extract |
| 20 add-delete-export cycles on standard fixture | unit resource suite | Passed; 143 ms hosted-run observation |
| 30 pages / 1,000 covers boundary | unit + browser observation | Passed in readable + self-extract |
| 31-page replacement rejected with resource-limit classification | unit + browser release-candidate suite | Passed |
| Over-limit import preserves current work and save path | browser release-candidate suite | Passed |
| PC Chromium `file://` readable / self-extract | full E2E matrix | 82 / 82 passed in each variant |
| PC Chromium HTTP startup | network-security suite | Passed |
| Physical Windows Edge file / HTTPS | Manual | **Unperformed** |
| Physical Android Chrome | Manual | **Unperformed** |
| Physical iPhone Safari | Manual | **Unperformed** |
| Real screen reader / 200% browser zoom | Manual | **Unperformed** |
| Background / screen lock on physical phone | Manual | **Unperformed** |
| OS save-cancel / file hand-off behavior | Manual | **Unperformed** |

## Review UX regressions

| Check | Result |
|---|---|
| Placed cover direct drag movement | Passed in readable + self-extract |
| Four-corner direct resize | Passed in readable + self-extract |
| Removed Move image / Two points / directional control UI remains absent | Passed in readable + self-extract |
| Zoom percentage resets to 100% whole-image centered view | Passed in readable + self-extract |
| Desktop page metadata/actions align to the same input row | Passed in readable + self-extract |
| Overlapping cover creation still works while Add cover is active | Passed through grouped-cover overlap regression |

## Automated totals

- Unit: **123 passed / 0 failed**
- Readable direct-file Chromium: **82 passed**
- Self-extract direct-file Chromium: **82 passed**
- Standalone validation: **success**
- PR Preview create/probe: **success**
- Readable HTML: **0.36 MB**
- Self-extract HTML: **0.12 MB**

Automated viewport or browser emulation is not recorded as physical-device completion. See `docs/MOBILE_ACCESSIBILITY_QA.md` for the separate accessibility/device checklist.
