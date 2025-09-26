# IncrementalSHA256

A **pure JavaScript, incremental SHA-256 hasher** designed for enterprise-grade usage.  

This library provides a streaming interface to compute SHA-256 hashes on data of **any size**, supports state persistence, cloning, and multiple output formats. It is suitable for large files, network streams, progressive uploads, or any application where chunked hashing is needed.

---

## Features

- **Streaming / incremental updates** via `update(Uint8Array)`
- **Finalize** hash with `digest()`
- **Multiple digest formats**: `'hex'` (default) or `'bytes'` (`Uint8Array`)
- **Cloneable state** via `clone()` to branch hash computations
- **Export/Import internal state** to resume hashing or persist progress
- Fully **robust and tested** against edge cases and randomized input chunks
- **No dependencies**, pure JavaScript
- Compatible with **Node.js** and browser environments

---

## Installation

```bash
npm install incremental-sha256-js
````

Or simply include in your project:

```javascript
import { IncrementalSHA256 } from './Hasher.js';
```

---

## Usage

### Basic Hashing

```javascript
import { IncrementalSHA256 } from './Hasher.js';

const hasher = new IncrementalSHA256();
hasher.update(new Uint8Array([0x61, 0x62, 0x63])); // 'abc'
const hashHex = hasher.digest(); // default 'hex'
console.log(hashHex); // 3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532
```

### Incremental / Chunked Updates

```javascript
const hasher = new IncrementalSHA256();
hasher.update(new Uint8Array([0x61])); // 'a'
hasher.update(new Uint8Array([0x62])); // 'b'
hasher.update(new Uint8Array([0x63])); // 'c'
console.log(hasher.digest('hex')); // same as above
```

### Clone State

```javascript
const hasher = new IncrementalSHA256();
hasher.update(new TextEncoder().encode("prefix"));

const cloneA = hasher.clone();
const cloneB = hasher.clone();

cloneA.update(new TextEncoder().encode("A"));
cloneB.update(new TextEncoder().encode("B"));

console.log(cloneA.digest('hex')); // hash of 'prefixA'
console.log(cloneB.digest('hex')); // hash of 'prefixB'
```

### Export / Import State

```javascript
const hasher = new IncrementalSHA256();
hasher.update(new TextEncoder().encode("partial data"));

const state = hasher.exportState();
// Persist state (e.g., IndexedDB, localStorage)

const resumedHasher = new IncrementalSHA256();
resumedHasher.importState(state);
resumedHasher.update(new TextEncoder().encode(" remaining data"));

console.log(resumedHasher.digest('hex'));
```

### Raw Bytes Output

```javascript
const hasher = new IncrementalSHA256();
hasher.update(new TextEncoder().encode("abc"));
const bytes = hasher.digest('bytes'); // Uint8Array of length 32
```

---

## API Reference

### `new IncrementalSHA256()`

Creates a new SHA-256 hasher instance.

### `update(chunk: Uint8Array)`

Feeds more data into the hash. Throws if called after `digest()`.

### `digest(format: 'hex' | 'bytes' = 'hex')`

Finalizes the hash. Returns a hex string by default, or a `Uint8Array` if `'bytes'` is specified. Cannot be called twice without `reset()`.

### `clone()`

Returns a deep copy of the current hasher state. Useful for branching.

### `exportState()`

Exports the current internal state. Can be persisted and later imported to resume hashing.

### `importState(state, strict = false)`

Imports a previously exported state. `strict` mode validates that all numbers are valid 32-bit integers.

### `reset()`

Resets the hasher to the initial state for reuse.

---

## Edge Cases & Guarantees

* Handles empty updates and single-byte updates correctly
* Safe for large inputs up to ~$2^53 / 8$ bytes
* Clone and export/import preserve exact hashing state
* Fully tested with standard vectors, incremental updates, large inputs, fuzzing, and edge cases

---

## Development & Testing

Run the **full enterprise test suite**:

```bash
node test-sha256-unified.js
```

Run **CI-ready test**:

```bash
node ci-test-sha256.js
```

---

## License

MIT License

Copyright (c) 2025 Edwin Hayward, Genki Productions Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. License Notice: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. Use at Your Own Risk: The Software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. By using this Software, you acknowledge and accept that any liability for damages, loss, or other issues arising from its use is entirely your own.

3. AI Authorship Note: Portions of this Software may have been generated with the assistance of AI tools. Final authorship for the Software rests with the copyright holder.

---

DISCLAIMER OF LIABILITY AND NO WARRANTY

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE COPYRIGHT HOLDER, CONTRIBUTORS, OR ANYONE DISTRIBUTING THE SOFTWARE ON THEIR BEHALF BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN ANY WAY CONNECTED WITH THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

BY USING THE SOFTWARE YOU ACKNOWLEDGE AND AGREE THAT YOU ARE USING IT AT YOUR OWN RISK AND THAT YOU, NOT THE COPYRIGHT HOLDER (EDWIN HAYWARD / GENKI PRODUCTIONS LTD), ARE SOLELY RESPONSIBLE FOR ANY CONSEQUENCES OF ITS USE.

---

## References

* [FIPS PUB 180-4: Secure Hash Standard (SHS)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)
* [SHA-256 Wikipedia](https://en.wikipedia.org/wiki/SHA-2)