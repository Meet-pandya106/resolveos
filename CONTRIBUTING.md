# Contributing to ResolveOS

Thank you for your interest in contributing to **ResolveOS**! We welcome contributions that improve security, reliability, domain capabilities, and user experience.

---

## 🛠️ Development Setup

### 1. Prerequisites
- Node.js 20+ (tested on Node v20, v22, v24)
- npm 9+

### 2. Getting Started
```bash
# Clone repository
git clone https://github.com/<your-username>/resolveos.git
cd resolveos

# Install workspace dependencies
npm install

# Seed synthetic local demo data
npm run db:seed

# Start development servers (Backend: 4000, Frontend: 5173)
npm run dev
```

---

## 🧪 Testing & Verification Requirements

Before submitting any Pull Request, ensure all quality gates pass:

```bash
# 1. Typecheck the entire monorepo
npm run typecheck

# 2. Run all Vitest suites (Unit, Integration, Security Regression)
npm test

# 3. Run the Prepublish Security & Hygiene scan
npm run prepublish:check

# 4. Verify the production build
npm run build
```

---

## 🔒 Security & Bug Disclosure

- Do **not** open public GitHub issues for security vulnerabilities.
- Please review [SECURITY.md](./docs/SECURITY.md) and report security findings to `security@resolveos.local`.

---

## 📝 Pull Request Guidelines

1. Create a descriptive feature branch (`git checkout -b feat/your-feature-name`).
2. Adhere to TypeScript strict types (no implicit `any`).
3. Maintain zero external tracking dependencies.
4. Include automated unit or integration tests for new business logic.
5. Update relevant documentation in `docs/` if modifying APIs or data schemas.

Thank you for helping make ResolveOS better!
