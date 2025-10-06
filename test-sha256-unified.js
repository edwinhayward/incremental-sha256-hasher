const { IncrementalSHA256 } = require('./Hasher.js');
const crypto = require('crypto');

function assertEqual(a, b, msg) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a !== b) throw new Error(`${msg} failed: ${a} !== ${b}`);
    return;
  }
  if (typeof a === 'string' || a instanceof String) {
    if (a !== b) throw new Error(`${msg} failed: ${a} !== ${b}`);
  } else if (a instanceof Uint8Array) {
    if (a.length !== b.length) throw new Error(`${msg} failed: length mismatch`);
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) throw new Error(`${msg} failed at index ${i}: ${a[i]} !== ${b[i]}`);
    }
  } else {
    throw new TypeError(`${msg} failed: unsupported type comparison for ${typeof a}`);
  }
}

function assertThrows(fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(`${msg} failed: did not throw`);
}

console.log("Starting unified SHA-256 enterprise test suite...");

let passed = 0;
let failed = 0;
function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// --- 1. Standard vectors
const vectors = {
  empty: "",
  abc: "abc",
  fox: "The quick brown fox jumps over the lazy dog",
  foxDot: "The quick brown fox jumps over the lazy dog.",
};
for (const [name, str] of Object.entries(vectors)) {
  runTest(`Standard vector '${name}' (hex)`, () => {
    const h = new IncrementalSHA256();
    h.update(Buffer.from(str));
    const digestHex = h.digest('hex');
    const expectedHex = crypto.createHash('sha256').update(str).digest('hex');
    assertEqual(digestHex, expectedHex, `Standard vector '${name}' (hex)`);

    const h2 = new IncrementalSHA256();
    h2.update(Buffer.from(str));
    const digestBytes = h2.digest('bytes');
    const expectedBytes = Uint8Array.from(Buffer.from(crypto.createHash('sha256').update(str).digest()));
    assertEqual(digestBytes, expectedBytes, `Standard vector '${name}' (bytes)`);
  });
}

// --- 2. Incremental updates vs single-shot
const data = "abcdefghijklmnopqrstuvwxyz";
const chunkSizes = [1, 2, 5, 13];
for (const size of chunkSizes) {
  runTest(`Incremental chunk size ${size}`, () => {
    const h = new IncrementalSHA256();
    for (let i = 0; i < data.length; i += size) {
      h.update(Buffer.from(data.slice(i, i+size)));
    }
    const digest = h.digest('hex');
    const expected = crypto.createHash('sha256').update(data).digest('hex');
    assertEqual(digest, expected, `Incremental chunk size ${size}`);
  });
}

// --- 3. Empty chunk updates
runTest("Empty chunk update", () => {
  const hEmpty = new IncrementalSHA256();
  hEmpty.update(Buffer.from([]));
  hEmpty.update(Buffer.from("abc"));
  assertEqual(hEmpty.digest('hex'), crypto.createHash('sha256').update("abc").digest('hex'), "Empty chunk update");
});

// --- 4. Single-byte updates
runTest("Single-byte updates", () => {
  const hSingle = new IncrementalSHA256();
  for (const c of "abc") hSingle.update(Buffer.from(c));
  assertEqual(hSingle.digest('hex'), crypto.createHash('sha256').update("abc").digest('hex'), "Single-byte updates");
});

// --- 5. Clone branching
runTest("Clone branching", () => {
  const hClone = new IncrementalSHA256();
  hClone.update(Buffer.from("prefix"));
  const clone1 = hClone.clone();
  const clone2 = hClone.clone();
  clone1.update(Buffer.from("A"));
  clone2.update(Buffer.from("B"));
  assertEqual(clone1.digest('hex'), crypto.createHash('sha256').update("prefixA").digest('hex'), "Clone1 branching");
  assertEqual(clone2.digest('hex'), crypto.createHash('sha256').update("prefixB").digest('hex'), "Clone2 branching");
});

// --- 6. Buffer-length edge case (63 bytes)
runTest("Buffer-length 63 edge", () => {
  const hEdge = new IncrementalSHA256();
  const sixtyThree = Buffer.alloc(63, 0x61);
  hEdge.update(sixtyThree);
  hEdge.update(Buffer.from("b"));
  const expected = crypto.createHash('sha256').update(Buffer.concat([sixtyThree, Buffer.from("b")])).digest('hex');
  assertEqual(hEdge.digest('hex'), expected, "Buffer-length 63 edge");
});

// --- 7. Use-after-digest errors
runTest("Update after digest error", () => {
  const hUsed = new IncrementalSHA256();
  hUsed.update(Buffer.from("abc"));
  hUsed.digest();
  assertThrows(() => hUsed.update(Buffer.from("x")), "Update after digest");
});
runTest("Digest after digest error", () => {
  const hUsed = new IncrementalSHA256();
  hUsed.update(Buffer.from("abc"));
  hUsed.digest();
  assertThrows(() => hUsed.digest(), "Digest after digest");
});

// --- 8. Export/import resume
runTest("Export/import resume", () => {
  const h1 = new IncrementalSHA256();
  h1.update(Buffer.from("hello "));
  const state = h1.exportState();
  const h2 = new IncrementalSHA256();
  h2.importState(state);
  h2.update(Buffer.from("world"));
  assertEqual(h2.digest('hex'), crypto.createHash('sha256').update("hello world").digest('hex'), "Export/import resume");
});

// --- 9. Large input (~10MB)
runTest("Large input 10MB", () => {
  const hLarge = new IncrementalSHA256();
  const safeChunk = Buffer.alloc(1e6, 0x61);
  for (let i = 0; i < 10; i++) hLarge.update(safeChunk);
  const expected = crypto.createHash('sha256').update(Buffer.alloc(10*1e6, 0x61)).digest('hex');
  assertEqual(hLarge.digest('hex'), expected, "Large input 10MB");
});

// --- 10. Invalid state imports
runTest("Import null state error", () => {
  const hInvalid = new IncrementalSHA256();
  assertThrows(() => hInvalid.importState(null), "Import null state");
});
runTest("Import bad H length error", () => {
  const hInvalid = new IncrementalSHA256();
  assertThrows(() => hInvalid.importState({H:[1,2,3], buffer:[], bufferLength:0, bytesHashed:0}), "Import bad H length");
});
runTest("Import invalid bufferLength error", () => {
  const hInvalid = new IncrementalSHA256();
  assertThrows(() => hInvalid.importState({H:new Array(8).fill(0), buffer:[], bufferLength:65, bytesHashed:0}), "Import invalid bufferLength > 64");
});

// --- 11. Import state with full buffer (edge case)
runTest("Import state with full buffer", () => {
  // 1. Manually construct a state with a full buffer.
  const h_initial = new IncrementalSHA256();
  const initial_state = h_initial.exportState(); // Gets us H0

  const fullBufferContent = Buffer.from('a'.repeat(64));
  const state_to_import = {
    H: initial_state.H, // Initial H0 values
    buffer: Array.from(fullBufferContent),
    bufferLength: 64,
    bytesHashed: 64, // We've "processed" 64 bytes into the buffer
    finalized: false,
  };

  // 2. Import this state. Then, update with more data.
  const h2 = new IncrementalSHA256();
  h2.importState(state_to_import);
  const suffix = Buffer.from('b');
  h2.update(suffix);

  // 3. Verify the final hash is correct.
  const finalData = Buffer.concat([fullBufferContent, suffix]);
  const expectedHash = crypto.createHash('sha256').update(finalData).digest('hex');
  assertEqual(h2.digest('hex'), expectedHash, "Importing full buffer state and updating");
});

// --- 12. Zero-length export/import
runTest("Zero-length export/import", () => {
  const hZero = new IncrementalSHA256();
  const stateZero = hZero.exportState();
  const hZero2 = new IncrementalSHA256();
  hZero2.importState(stateZero);
  hZero2.update(Buffer.from("abc"));
  assertEqual(hZero2.digest('hex'), crypto.createHash('sha256').update("abc").digest('hex'), "Zero-length export/import");
});

// --- 13. Fuzz testing (randomized chunk splits)
function randomString(length) {
  const chars = [];
  for (let i = 0; i < length; i++) {
    chars.push(String.fromCharCode(32 + Math.floor(Math.random() * 95)));
  }
  return chars.join('');
}
const NUM_FUZZ = 50;
const MAX_LENGTH = 5000;
for (let t = 0; t < NUM_FUZZ; t++) {
  runTest(`Fuzz test #${t+1}`, () => {
    const len = Math.floor(Math.random() * MAX_LENGTH) + 1;
    const input = randomString(len);
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    const h = new IncrementalSHA256();
    let offset = 0;
    while (offset < input.length) {
      const chunkSize = Math.floor(Math.random() * 20) + 1;
      h.update(Buffer.from(input.slice(offset, offset + chunkSize)));
      offset += chunkSize;
    }
    assertEqual(h.digest('hex'), expected, `Fuzz test #${t+1}, length ${len}`);
  });
}

console.log(`\nTest summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
else console.log("All unified SHA-256 tests passed ✅");