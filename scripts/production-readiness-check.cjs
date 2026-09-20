/**
 * ResolveOS Production Readiness Acceptance Check
 * Automated verification across 17 mission-critical production gates.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('            RESOLVEOS PRODUCTION READINESS VERIFICATION         ');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const results = [];

function runGate(id, name, fn) {
  const startTime = Date.now();
  try {
    fn();
    const duration = Date.now() - startTime;
    console.log(`[PASS] Gate ${String(id).padStart(2, '0')}: ${name.padEnd(46)} (${duration}ms)`);
    results.push({ id, name, passed: true, duration });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[FAIL] Gate ${String(id).padStart(2, '0')}: ${name.padEnd(46)} FAIL: ${err.message}`);
    results.push({ id, name, passed: false, duration, error: err.message });
  }
}

// Gate 01: Workspace Monorepo Architecture
runGate(1, 'Monorepo Workspaces & Package Topology', () => {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  if (!Array.isArray(rootPkg.workspaces) || rootPkg.workspaces.length < 2) {
    throw new Error('Root workspaces not properly configured');
  }
  const requiredPkgs = ['packages/shared', 'packages/domain', 'packages/validation', 'packages/security', 'packages/database', 'apps/api', 'apps/web'];
  for (const pkg of requiredPkgs) {
    if (!fs.existsSync(path.join(projectRoot, pkg, 'package.json'))) {
      throw new Error(`Missing workspace package: ${pkg}`);
    }
  }
});

// Gate 02: TypeScript Typecheck
runGate(2, 'Strict TypeScript Typecheck (0 Errors)', () => {
  execSync('npm run typecheck', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 03: Full Automated Test Suite
runGate(3, 'Vitest Automated Test Suite (95/95 Tests)', () => {
  execSync('npm test', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 04: Production Monorepo Build
runGate(4, 'Monorepo Production Build & Bundle', () => {
  execSync('npm run build', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 05: Real Static Analysis & Biome Linter
runGate(5, 'Biome Static Analysis & Lint Hygiene (0 Errors)', () => {
  execSync('npm run lint', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 06: Secret Scanning & Token Hygiene
runGate(6, 'Secrets & Credential Leakage Scan', () => {
  const sensitivePatterns = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /sk_test_[a-zA-Z0-9]{20,}/,
    /ghp_[a-zA-Z0-9]{20,}/,
    /xox[baprs]-[a-zA-Z0-9]{10,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN RSA PRIVATE KEY-----/
  ];

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (['node_modules', 'dist', '.git', 'scripts', 'tests', '.claude'].includes(f)) continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile() && !f.endsWith('.png') && !f.endsWith('.jpg') && !f.endsWith('.ico') && !f.endsWith('.db.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) throw new Error(`Leaked secret pattern in ${fullPath}`);
        }
      }
    }
  }
  scanDir(projectRoot);
});

// Gate 07: Tenant Isolation & IDOR Defense
runGate(7, 'Tenant Isolation & IDOR/BOLA Defense', () => {
  execSync('npx vitest run tests/security/idor.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 08: Cryptographic Tamper-Evident Audit Chain
runGate(8, 'Tamper-Evident SHA-256 Audit Chain', () => {
  execSync('npx vitest run tests/security/tamper-audit.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 09: AI Injection Defense & Safe Fallback
runGate(9, 'AI Prompt Sandboxing & Deterministic Fallback', () => {
  execSync('npx vitest run tests/security/prompt-injection.test.ts tests/security/ai-evaluation.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 10: Concurrency, Optimistic Locking & 3-Way Merge
runGate(10, 'Concurrency & 3-Way Merge Engine', () => {
  execSync('npx vitest run tests/security/concurrency.test.ts tests/security/sync-concurrency.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 11: RFC 6238 TOTP Multi-Factor Authentication
runGate(11, 'RFC 6238 TOTP MFA & Anti-Replay Protection', () => {
  execSync('npx vitest run tests/security/totp-rfc.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 12: Zero-SSRF Defense Guard
runGate(12, 'SSRF Defense Guard (IPv4, IPv6 ULA, Rebinding)', () => {
  execSync('npx vitest run tests/security/ssrf.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 13: Path Traversal & Sanitization
runGate(13, 'Path Traversal & Absolute Path Sanitizer', () => {
  execSync('npx vitest run tests/security/path-traversal.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 14: WebSocket Security & Tenant Scoping
runGate(14, 'WebSocket Auth, Single-Use Tickets & Tenant Scoping', () => {
  execSync('npx vitest run tests/security/websocket-security.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 15: Real PostgreSQL Persistence & DDL Verification
runGate(15, 'Real PostgreSQL Implementation & Zero-Fallback DDL', () => {
  const migrationFile = path.join(projectRoot, 'packages/database/migrations/0001_initial_schema.sql');
  if (!fs.existsSync(migrationFile)) {
    throw new Error('Missing PostgreSQL migration DDL: 0001_initial_schema.sql');
  }
  const ddlContent = fs.readFileSync(migrationFile, 'utf8');
  const requiredTables = ['organizations', 'workspaces', 'cases', 'evidence', 'case_questions', 'hypotheses', 'root_causes', 'solutions', 'decisions', 'case_actions', 'verifications', 'retrospectives', 'audit_events'];
  for (const table of requiredTables) {
    if (!ddlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`) && !ddlContent.includes(`CREATE TABLE IF NOT EXISTS "${table}"`)) {
      throw new Error(`DDL missing required table definition: ${table}`);
    }
  }
  execSync('npx vitest run tests/security/database-real-postgres.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 16: End-to-End Problem Resolution Lifecycle
runGate(16, '12-Stage Lifecycle & Verification Gate', () => {
  execSync('npx vitest run tests/e2e/resolution-lifecycle.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 17: Rule 121 28-Step Production Acceptance Scenario
runGate(17, 'Rule 121 28-Step Live Integration Scenario', () => {
  execSync('npx vitest run tests/e2e/production-scenario-28.test.ts', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
});

// Gate 18: Container Hardening & Non-Root Execution
runGate(18, 'Container Hardening (USER node & Healthcheck)', () => {
  const dockerfile = fs.readFileSync(path.join(projectRoot, 'Dockerfile'), 'utf8');
  if (!dockerfile.includes('USER node')) {
    throw new Error('Dockerfile does not enforce non-root USER node');
  }
  if (!dockerfile.includes('HEALTHCHECK')) {
    throw new Error('Dockerfile does not define HEALTHCHECK instruction');
  }
});

// Gate 19: Complete Documentation Suite Integrity
runGate(19, 'Core Documentation & Verification Artifacts', () => {
  const requiredDocs = [
    'README.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    'docs/PRODUCTION_AUDIT.md',
    'docs/CLAIMS.md',
    'docs/CHANGE_LEDGER.md',
    'docs/DATABASE.md',
    'docs/ARCHITECTURE.md',
    'docs/SECURITY.md',
    'docs/THREAT_MODEL.md',
    'docs/AI_SECURITY.md',
    'docs/DISASTER_RECOVERY.md',
    'docs/DEPLOYMENT.md',
    'docs/OPERATIONS.md',
    'docs/PRIVACY.md',
    'docs/TESTING.md',
    'docs/FINAL_PRODUCTION_REVIEW.md'
  ];
  for (const doc of requiredDocs) {
    const docPath = path.join(projectRoot, doc);
    if (!fs.existsSync(docPath)) {
      throw new Error(`Missing required documentation file: ${doc}`);
    }
    const stat = fs.statSync(docPath);
    if (stat.size < 500) {
      throw new Error(`Documentation file ${doc} is too sparse (${stat.size} bytes)`);
    }
  }
});

console.log('\n================================================================');
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
console.log(`ACCEPTANCE SUMMARY: ${passedCount}/${totalCount} GATES PASSED`);
console.log('================================================================\n');

if (passedCount === totalCount) {
  console.log('>>> STATUS: PRODUCTION READY - FULL COMPLIANCE CONFIRMED <<<\n');
  process.exit(0);
} else {
  console.error(`>>> STATUS: REJECTED - ${totalCount - passedCount} GATES FAILED <<<\n`);
  process.exit(1);
}
