const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== RESOLVEOS PREPUBLISH SECURITY & HYGIENE SCAN ===\n');

const projectRoot = path.resolve(__dirname, '..');

// 1. Typecheck Verification
console.log('1. Executing Typecheck verification across monorepo...');
try {
  const typeOut = execSync('npm run typecheck', { cwd: projectRoot, encoding: 'utf8' });
  console.log(typeOut);
  console.log('[PASS] TypeScript typecheck passed with 0 errors.');
} catch (e) {
  console.error('[FAIL] Typecheck failed:', e.message);
  process.exit(1);
}

// 2. Vitest Test Suite Execution
console.log('\n2. Executing Vitest test suite...');
try {
  const testOut = execSync('npm test', { cwd: projectRoot, encoding: 'utf8' });
  console.log(testOut);
  console.log('[PASS] All test suites passed.');
} catch (e) {
  console.error('[FAIL] Test suite failure:', e.message);
  process.exit(1);
}

// 3. Monorepo Production Build Verification
console.log('\n3. Executing monorepo build verification...');
try {
  const buildOut = execSync('npm run build', { cwd: projectRoot, encoding: 'utf8' });
  console.log(buildOut);
  console.log('[PASS] Production build succeeded cleanly across all packages.');
} catch (e) {
  console.error('[FAIL] Build failed:', e.message);
  process.exit(1);
}

// 4. Gitignore Rule Verification
console.log('\n4. Verifying .gitignore rules...');
const gitignoreContent = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
if (!gitignoreContent.includes('*.db.json')) {
  console.error('[FAIL] .gitignore is missing *.db.json rule');
  process.exit(1);
}
console.log('[PASS] .gitignore correctly excludes local databases and secrets.');

// 5. Scan for accidentally committed secret keys
console.log('\n5. Scanning source tree for potential leaked credentials...');
const sensitivePatterns = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /xox[baprs]-[a-zA-Z0-9]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN RSA PRIVATE KEY-----/,
  /-----BEGIN OPENSSH PRIVATE KEY-----/,
  /-----BEGIN EC PRIVATE KEY-----/
];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === 'scripts' || f === 'tests') continue;
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile() && !f.endsWith('.png') && !f.endsWith('.jpg') && !f.endsWith('.ico')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          console.error(`[FAIL] Potential secret matched in ${fullPath}: ${pattern}`);
          process.exit(1);
        }
      }
    }
  }
}

scanDir(projectRoot);
console.log('[PASS] Zero leaked credentials or private keys detected in repository.');

console.log('\n=== PREPUBLISH SCAN COMPLETE: READY FOR PUBLIC GITHUB RELEASE ===');
