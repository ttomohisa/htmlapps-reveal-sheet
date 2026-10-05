# Synthetic image fixtures

Generated offline by `scripts/prepare-test-fixtures.mjs`. JPEG (quality 95) and WebP bytes were drawn with Pillow from an original 120×80 four-quadrant image (red, green, blue, yellow). PNG and APNG are built deterministically from the same pixel pattern with Node's zlib and independent PNG chunk/CRC construction. No user files or third-party artwork; dedicated to CC0.

JPEG EXIF orientation 1–8 is injected into a common JPEG, without changing its compressed pixels. Browser tests compare quadrant colors against eight independently specified geometric permutations. The top-left pixel of the transparent fixture has zero alpha. Animated samples contain two frames. Truncated files are prefixes of static samples. oversize-header.png has a valid IHDR CRC but deliberately incompatible 8192×2000 dimensions and must fail before decode.

Helpers generate images before tests, publishing each file atomically so concurrent workers cannot read partial output. Generated images are not tracked or embedded in the app. `jpeg-fixture.mjs` holds the compact original JPEG fixture separately to simplify byte-level review.
