# Reveal Sheet QA matrix — v1.2.1 candidate

The current PR is [#22](https://github.com/ttomohisa/htmlapps-reveal-sheet/pull/22).
The current published release remains **v1.2.0** until the PR is merged and
the main-branch release workflow completes. This page keeps earlier
v0.9.0 measurements below as **historical evidence**, not as current totals.

## v1.2.1 automated verification

Baseline: commit `c4cbb8688fe98b0a07f1f42c056de4f63fd6a125` on the
PR branch, before the documentation audit.
The four GitHub Actions workflows on that commit completed successfully.

| Verification | Automated scope | Evidence / result |
|---|---|---|
| Unit tests | Core, schema v1/v2, import/export, history, persistence, security, resource limits | [155 passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671193) |
| Readable `file://` app | Chromium end-to-end, desktop and simulated mobile, save/reopen/lesson | [163 passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671193) |
| Self-extracting `file://` app | Same Chromium end-to-end suite | [163 passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671193) |
| Build/standalone constraints | Exact root readable copy, self-extract, CSP/network restrictions, release packaging preparation | [Passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671184) |
| PR preview | Cloudflare PR preview deployment | [Passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671328) |
| UI captures | Desktop/mobile viewport scene capture | [Passed](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671301) |
| Release creation | Tag and GitHub Release created from merged `main`, only after release CI | **Not performed for v1.2.1** |

**Next step:** verify the final PR head again after this documentation audit.
A green run on an earlier SHA is not evidence that newer changes passed.

## Manual and hardware status

| Verification | Status |
|---|---|
| Real Android Chrome image import, editing, study, JSON/HTML saving, reopening | **Not performed** |
| Real iPhone Safari equivalent workflow | **Not performed** |
| Actual device browser/OS file-saving and received HTML opening | **Not performed** |
| Firefox/macOS Safari compatibility | **Not performed** |
| Screen reader, real 200% zoom, software keyboard, device rotation | **Not performed** |
| Historical recurring Android export failure | **Root cause still unknown**; `RS-SAVE-3` diagnostics are available on failure |

Chromium viewport emulation does not establish hardware compatibility.
The 20 MiB input/30-page/1,000-cover limits are rejection bounds, not
an assurance that every device can handle maximum-size material.

---

## Historical v0.9.0 release-candidate matrix

This matrix separates automated evidence from physical-device/manual evidence. A configured input ceiling is a rejection rule, not a guarantee that every device can process data at that ceiling.

Automated evidence below is from application source commit `527f2d9a02f8200f2e93cefe819542b901890bc2`: application workflow `37582287340`, standalone workflow `37582287373`, preview workflow `37582287356`. The application run produced QA artifact `reveal-qa-527f2d9a02f8200f2e93cefe819542b901890bc2` (ID `11465390311`).

### T17 — network, CSP and hostile input

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

### T18 — resource, recovery and device/startup paths

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

### Review UX regressions

| Check | Result |
|---|---|
| Placed cover direct drag movement | Passed in readable + self-extract |
| Four-corner direct resize | Passed in readable + self-extract |
| Removed Move image / Two points / directional control UI remains absent | Passed in readable + self-extract |
| Zoom percentage resets to 100% whole-image centered view | Passed in readable + self-extract |
| Desktop page metadata/actions align to the same input row | Passed in readable + self-extract |
| Overlapping cover creation still works while Add cover is active | Passed through grouped-cover overlap regression |

### Automated totals

- Unit: **123 passed / 0 failed**
- Readable direct-file Chromium: **82 passed**
- Self-extract direct-file Chromium: **82 passed**
- Standalone validation: **success**
- PR Preview create/probe: **success**
- Readable HTML: **0.36 MB**
- Self-extract HTML: **0.12 MB**

Automated viewport or browser emulation is not recorded as physical-device completion. See `docs/MOBILE_ACCESSIBILITY_QA.md` for the separate accessibility/device checklist.
