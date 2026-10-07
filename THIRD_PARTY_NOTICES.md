# Third-party notices

## Runtime

Reveal Sheet v1.0.0 embeds no third-party JavaScript, CSS, model, font or WASM package at runtime. `dependencies.json` and `dependencies.lock.json` retain the template's empty lock contract.

## Template

Derived from ttomohisa/htmlapps-template, MIT License. The original LICENSE is retained. At implementation start, template main was cb908779682fa315ccd0f1eb58549f6c208f36f0 and the target repository shared its source tree. Future updates must be verified live, not inferred from this historical record.

## Development-only software

`@playwright/test`, `playwright` and `playwright-core` 1.63.0 are Apache-2.0 licensed development dependencies, pinned by package-lock.json. Browser binaries downloaded for tests are not embedded in the distributed app. Runtime dependency manifests deliberately exclude development tools.

Synthetic fixture pixels and the capture worksheet were created for this project, contain no user files or third-party artwork, and are dedicated to CC0. JPEG/WebP fixture bytes were prepared offline with Pillow; production users and the CI fixture generator do not need Pillow.
