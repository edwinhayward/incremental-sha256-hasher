// ci-test-sha256.js
const { execSync } = require('child_process');
const path = require('path');

(async function main() {
  console.log("Starting CI/CD SHA-256 test suite...");

  try {
    // Require the unified test suite
    const testPath = path.join(__dirname, 'test-sha256-unified.js');
    require(testPath);

    console.log("\n✅ All SHA-256 tests passed successfully. CI status: PASS");
    process.exit(0); // success
  } catch (err) {
    console.error("\n❌ SHA-256 test suite failed!");
    console.error(err.stack || err);
    console.error("CI status: FAIL");
    process.exit(1); // failure
  }
})();
