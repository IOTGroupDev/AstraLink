# 🚀 CI/CD Pipeline Documentation

Comprehensive CI/CD setup for AstraLink project using GitHub Actions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [Setup Instructions](#setup-instructions)
4. [Secrets Configuration](#secrets-configuration)
5. [Usage Guide](#usage-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Our CI/CD pipeline automates:
- ✅ Code quality checks (linting, formatting)
- ✅ TypeScript type checking
- ✅ Automated testing with coverage
- ✅ Security scanning
- ✅ Docker image building
- ✅ Automated deployments
- ✅ Dependency updates

### Architecture

```
GitHub Push/PR
      ↓
┌─────────────────────────────────────┐
│   Parallel CI Workflows             │
├─────────────────────────────────────┤
│ • Lint (ESLint, Prettier)           │
│ • Test (Jest with coverage)         │
│ • Build (TypeScript compilation)    │
│ • Security (CodeQL, npm audit)      │
│ • Docker (Build & scan)             │
└─────────────────────────────────────┘
      ↓
   All Pass?
      ↓
┌─────────────────────────────────────┐
│   Deployment (main branch only)     │
├─────────────────────────────────────┤
│ • Build Docker image                │
│ • Push to registry                  │
│ • Run migrations                    │
│ • Deploy to environment             │
│ • Health check                      │
└─────────────────────────────────────┘
```

---

## 📁 Workflows

### 1. **CI Pipeline** (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to `main` or `dev`
- Pushes to `main` or `dev`

**Jobs:**

#### Backend
- **backend-lint**: ESLint + TypeScript check
- **backend-test**: Unit tests with PostgreSQL + Redis
- **backend-build**: Production build

#### Frontend
- **frontend-lint**: TypeScript check
- **frontend-test**: Unit tests

**Duration:** ~5-8 minutes

**Example Output:**
```
✅ backend-lint      (1m 23s)
✅ backend-test      (2m 45s)
✅ backend-build     (1m 34s)
✅ frontend-lint     (0m 58s)
✅ frontend-test     (1m 12s)
───────────────────────────────
✅ CI Success        (8m 52s total)
```

---

### 2. **Docker Build** (`.github/workflows/docker.yml`)

**Triggers:**
- Push to `main` or `dev`
- Pull requests to `main`
- Tags: `v*.*.*`

**Jobs:**
- **build-backend**: Multi-arch Docker build (amd64, arm64)
- **test-docker-compose**: Integration test with docker-compose

**Features:**
- 🔄 Layer caching (GitHub Actions cache)
- 🔍 Trivy vulnerability scanning
- 📦 Multi-platform builds
- 🏷️ Automatic tagging (branch, SHA, version)

**Tags Generated:**
```
ghcr.io/your-org/astralink/backend:main
ghcr.io/your-org/astralink/backend:dev
ghcr.io/your-org/astralink/backend:main-abc1234
ghcr.io/your-org/astralink/backend:v1.0.0
ghcr.io/your-org/astralink/backend:latest
```

---

### 3. **Security Scanning** (`.github/workflows/security.yml`)

**Triggers:**
- Pull requests
- Pushes to `main` or `dev`
- Weekly schedule (Mondays at 9:00 UTC)

**Jobs:**

#### Dependency Review
- Reviews dependency changes in PRs
- Fails on moderate+ severity vulnerabilities

#### NPM Audit
- Scans backend and frontend for vulnerabilities
- Generates audit reports

#### CodeQL Analysis
- Static code analysis for JavaScript/TypeScript
- Detects security and quality issues

#### Secret Scanning
- TruffleHog for leaked secrets
- Scans commit history

#### Prisma Security
- Validates Prisma schema
- Checks schema formatting

**Example Findings:**
```
🔍 CodeQL: 0 critical, 2 high, 5 medium
🔍 npm audit: 0 critical, 3 moderate
🔍 TruffleHog: 0 secrets found
✅ Prisma schema: valid
```

---

### 4. **Code Quality** (`.github/workflows/code-quality.yml`)

**Triggers:**
- Pull requests
- Pushes to `main` or `dev`

**Checks:**

#### Prettier
- Ensures consistent code formatting
- Fails if unformatted code detected

#### ESLint
- Linting with inline annotations
- JSON report for artifacts

#### TypeScript
- Type checking for backend + frontend
- No `any` types allowed (strict mode)

#### Complexity Analysis
- Measures cyclomatic complexity
- Identifies complex functions

#### Duplicate Code Detection
- Finds code duplications
- Reports duplicates > 5 lines

#### Bundle Size (PR only)
- Tracks bundle size changes
- Comments on PR with size diff

---

### 5. **Deployment** (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` (staging)
- Tags `v*.*.*` (production)
- Manual workflow dispatch

**Environments:**
- 🟡 **Staging**: Auto-deploy on `main` push
- 🔴 **Production**: Deploy on version tags

**Deployment Flow:**
```
1. Determine environment (staging/production)
2. Log in to container registry
3. Pull Docker image
4. Run database migrations
5. Deploy to server
6. Verify deployment (health check)
7. Notify team (Slack)
8. [On failure] Trigger rollback
```

**Example:**
```bash
# Staging deployment
git push origin main

# Production deployment
git tag v1.0.0
git push --tags
```

---

### 6. **Dependabot** (`.github/dependabot.yml`)

**Automatic Updates:**
- 📦 Backend npm packages (weekly)
- 📦 Frontend npm packages (weekly)
- 🐳 Docker base images (weekly)
- 🔧 GitHub Actions (weekly)

**Grouping:**
- NestJS packages grouped
- Prisma packages grouped
- Expo packages grouped
- React packages grouped
- Dev dependencies grouped (minor/patch only)

**PR Limits:**
- Backend: 10 PRs max
- Frontend: 10 PRs max
- Root: 5 PRs max

---

## 🔧 Setup Instructions

### 1. Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Enable **Allow all actions and reusable workflows**
3. Set **Workflow permissions** to **Read and write permissions**
4. Enable **Allow GitHub Actions to create and approve pull requests**

### 2. Configure Secrets

Go to **Settings** → **Secrets and variables** → **Actions**

#### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | Production database URL | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | `eyJhbG...` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-secure-secret-key...` |
| `ANTHROPIC_API_KEY` | Claude AI API key | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |

#### Optional Secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `SLACK_WEBHOOK` | Slack webhook URL | Deployment notifications |
| `CODECOV_TOKEN` | Codecov upload token | Coverage reports |
| `DEPLOY_SSH_KEY` | SSH key for deployment | Server deployments |
| `AWS_ACCESS_KEY_ID` | AWS credentials | AWS deployments |
| `GCP_SERVICE_ACCOUNT` | GCP credentials | GCP deployments |

### 3. Configure Environments

Go to **Settings** → **Environments**

#### Staging Environment
- **Name**: `staging`
- **Deployment branches**: `main` only
- **Reviewers**: None (auto-deploy)
- **Environment secrets**:
  - `DATABASE_URL`: Staging database
  - `API_URL`: `https://staging-api.example.com`

#### Production Environment
- **Name**: `production`
- **Deployment branches**: Tags only
- **Reviewers**: Required (2 approvers recommended)
- **Wait timer**: 5 minutes
- **Environment secrets**:
  - `DATABASE_URL`: Production database
  - `API_URL`: `https://api.example.com`

### 4. Enable Branch Protection

Go to **Settings** → **Branches** → **Add rule**

#### For `main` branch:
- ✅ Require a pull request before merging
- ✅ Require approvals (minimum 1)
- ✅ Require status checks to pass before merging
  - `backend-lint`
  - `backend-test`
  - `backend-build`
  - `frontend-lint`
  - `frontend-test`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

#### For `dev` branch:
- ✅ Require status checks to pass before merging
  - `backend-lint`
  - `backend-test`
  - `frontend-lint`

### 5. Enable Dependabot

1. Go to **Settings** → **Code security and analysis**
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**
4. Enable **Dependabot version updates** (uses `.github/dependabot.yml`)

### 6. Enable CodeQL

1. Go to **Settings** → **Code security and analysis**
2. Enable **CodeQL analysis**
3. Configure languages: JavaScript, TypeScript

---

## 🔐 Secrets Configuration

### Setting Secrets

#### Via GitHub UI:
```
Settings → Secrets and variables → Actions → New repository secret
```

#### Via GitHub CLI:
```bash
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_SECRET --body "your-secret-key-here"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-api03-..."
```

### Environment-Specific Secrets

#### Staging:
```bash
gh secret set DATABASE_URL --env staging --body "postgresql://staging..."
```

#### Production:
```bash
gh secret set DATABASE_URL --env production --body "postgresql://prod..."
```

### Viewing Secrets

```bash
# List all secrets
gh secret list

# List environment secrets
gh secret list --env production
```

---

## 📖 Usage Guide

### Running CI Locally

#### Backend Tests
```bash
cd backend

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

#### Frontend Tests
```bash
cd frontend

# Install dependencies
npm ci

# Run tests
npm test

# Type check
npx tsc --noEmit
```

### Building Docker Image Locally

```bash
# Backend
cd backend
docker build -t astralink-backend .

# Test with docker-compose
docker-compose up -d
docker-compose logs -f backend
```

### Triggering Manual Deployment

#### Via GitHub UI:
1. Go to **Actions** → **Deploy**
2. Click **Run workflow**
3. Select branch and environment
4. Click **Run workflow**

#### Via GitHub CLI:
```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production
gh workflow run deploy.yml -f environment=production
```

### Creating a Release

```bash
# Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This will trigger:
# 1. Docker build with version tag
# 2. Production deployment
# 3. GitHub release creation
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Tests Failing in CI but Passing Locally

**Cause**: Environment differences

**Solution**:
```bash
# Use same Node version as CI
nvm use 20

# Clean install
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

#### 2. Docker Build Failing

**Cause**: Missing dependencies or permissions

**Check logs**:
```bash
# View workflow logs
gh run view --log-failed

# View Docker build logs
docker-compose logs backend
```

**Solution**:
- Ensure `.dockerignore` is present
- Check Dockerfile syntax
- Verify base image availability

#### 3. Database Migrations Failing

**Cause**: Missing DATABASE_URL secret

**Solution**:
```bash
# Set the secret
gh secret set DATABASE_URL --body "postgresql://..."

# Verify it's set
gh secret list | grep DATABASE_URL
```

#### 4. Deployment Hanging

**Cause**: Health check timing out

**Solution**:
- Increase health check timeout
- Check server logs
- Verify deployment endpoint

#### 5. CodeQL Analysis Timeout

**Cause**: Large codebase

**Solution**:
- Increase timeout in workflow:
```yaml
- name: Perform CodeQL Analysis
  timeout-minutes: 30  # Increase from default 15
```

### Debugging Workflows

#### View workflow runs:
```bash
gh run list

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

#### Re-run failed jobs:
```bash
gh run rerun <run-id>

# Re-run only failed jobs
gh run rerun <run-id> --failed
```

#### Cancel running workflow:
```bash
gh run cancel <run-id>
```

### Getting Help

#### View workflow status:
```bash
gh run watch
```

#### Check workflow file syntax:
```bash
# Install actionlint
brew install actionlint

# Lint workflow files
actionlint .github/workflows/*.yml
```

---

## 📊 Metrics & Monitoring

### CI Performance

**Target Metrics:**
- ⏱️ CI duration: < 10 minutes
- ✅ Success rate: > 95%
- 🔄 Flakiness: < 2%

### Coverage Goals

**Current:**
- Backend: ~0.5%
- Frontend: ~0.1%

**Target:**
- Backend: 80%+
- Frontend: 70%+

### Security

**Goals:**
- 🔒 Zero critical vulnerabilities
- 🔒 Zero high vulnerabilities
- 🔍 Weekly security scans

---

## 🔄 Workflow Lifecycle

### Pull Request Flow

```
1. Developer creates PR
   ↓
2. CI runs (lint, test, build)
   ↓
3. Code quality checks
   ↓
4. Security scans
   ↓
5. All checks pass → PR ready for review
   ↓
6. Review + approval
   ↓
7. Merge to dev
   ↓
8. [Optional] Deploy to dev environment
```

### Release Flow

```
1. Merge dev → main
   ↓
2. CI runs on main
   ↓
3. Auto-deploy to staging
   ↓
4. QA testing on staging
   ↓
5. Create version tag (v1.0.0)
   ↓
6. Production deployment triggered
   ↓
7. Required approvals
   ↓
8. Deploy to production
   ↓
9. Health checks
   ↓
10. Notify team
```

---

## 🎯 Best Practices

### Commits

```bash
# Use conventional commits
git commit -m "feat: add user authentication"
git commit -m "fix: resolve JWT expiration issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for auth service"
git commit -m "chore: upgrade dependencies"
```

### Pull Requests

1. ✅ Keep PRs small (< 500 lines)
2. ✅ Fill out PR template completely
3. ✅ Link to related issues
4. ✅ Add tests for new features
5. ✅ Update documentation
6. ✅ Request reviews from relevant team members
7. ✅ Resolve all comments before merging

### Testing

1. ✅ Write tests before code (TDD)
2. ✅ Aim for 80%+ coverage
3. ✅ Test edge cases
4. ✅ Mock external dependencies
5. ✅ Use descriptive test names

### Security

1. ✅ Never commit secrets
2. ✅ Use environment variables
3. ✅ Review Dependabot PRs weekly
4. ✅ Fix security vulnerabilities immediately
5. ✅ Scan Docker images before deployment

---

## 📚 Additional Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

### Tools
- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [actionlint](https://github.com/rhysd/actionlint) - Lint workflow files
- [gh CLI](https://cli.github.com/) - GitHub command-line tool

### Monitoring
- [GitHub Actions Dashboard](https://github.com/your-org/astralink/actions)
- [Codecov Dashboard](https://codecov.io/gh/your-org/astralink)
- [Docker Hub](https://hub.docker.com/r/your-org/astralink)

---

## 🎉 Summary

You now have a complete CI/CD pipeline with:

✅ **Automated Testing** - Every PR is tested
✅ **Code Quality** - Enforced standards
✅ **Security Scanning** - Continuous vulnerability monitoring
✅ **Docker Builds** - Multi-platform images
✅ **Automated Deployments** - Staging and production
✅ **Dependency Updates** - Automated with Dependabot
✅ **Issue Templates** - Structured bug reports and feature requests
✅ **PR Templates** - Comprehensive checklists

**Next Steps:**
1. Configure secrets in GitHub
2. Enable branch protection
3. Review and customize deployment workflow
4. Set up monitoring and alerts
5. Train team on workflows

---

**Questions?** Check the [Troubleshooting](#troubleshooting) section or open an issue!
