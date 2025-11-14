# ⚡ CI/CD Quick Start Guide

Get CI/CD up and running in **15 minutes**!

---

## 🚀 Step 1: Enable GitHub Actions (2 minutes)

### Via GitHub UI:

1. Go to **Settings** → **Actions** → **General**
2. Set permissions:
   - ✅ Allow all actions and reusable workflows
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests
3. Click **Save**

### Via CLI:
```bash
gh api -X PUT repos/:owner/:repo/actions/permissions \
  -f enabled=true \
  -f allowed_actions=all
```

---

## 🔐 Step 2: Configure Secrets (5 minutes)

### Minimum Required Secrets

Copy and run this script (replace values):

```bash
# Database
gh secret set DATABASE_URL --body "postgresql://user:password@host:5432/astralink"

# JWT
gh secret set JWT_SECRET --body "your-super-secure-jwt-secret-minimum-32-characters-long"

# Supabase
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"

# AI Providers (at least one required)
gh secret set ANTHROPIC_API_KEY --body "sk-ant-api03-your-key"
gh secret set OPENAI_API_KEY --body "sk-proj-your-key"
```

### Verify Secrets

```bash
gh secret list
```

Expected output:
```
DATABASE_URL                Updated 2025-11-14
JWT_SECRET                  Updated 2025-11-14
SUPABASE_URL                Updated 2025-11-14
SUPABASE_SERVICE_ROLE_KEY   Updated 2025-11-14
ANTHROPIC_API_KEY           Updated 2025-11-14
OPENAI_API_KEY              Updated 2025-11-14
```

---

## 🛡️ Step 3: Enable Branch Protection (3 minutes)

### Quick Setup Script

```bash
# Protect main branch
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  --input - <<< '{
    "required_pull_request_reviews": {
      "required_approving_review_count": 1
    },
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "backend-lint",
        "backend-test",
        "backend-build",
        "frontend-lint"
      ]
    },
    "enforce_admins": false,
    "required_conversation_resolution": true,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

### Or via UI:

1. **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Require status checks: `backend-lint`, `backend-test`, `backend-build`, `frontend-lint`
   - ✅ Require conversation resolution
4. **Create**

---

## ✅ Step 4: Test the Pipeline (5 minutes)

### Create a Test PR

```bash
# Create a new branch
git checkout -b test-ci-pipeline

# Make a small change
echo "# CI/CD Test" >> TEST.md
git add TEST.md
git commit -m "test: verify CI/CD pipeline"

# Push and create PR
git push -u origin test-ci-pipeline
gh pr create --title "Test: CI/CD Pipeline" --body "Testing automated CI/CD"
```

### Watch CI Run

```bash
# Watch in real-time
gh run watch

# Or view in browser
gh pr view --web
```

### Expected Result

You should see:
```
✅ backend-lint (1-2 min)
✅ backend-test (2-3 min)
✅ backend-build (1-2 min)
✅ frontend-lint (1 min)
✅ frontend-test (1 min)
```

Total time: ~5-8 minutes

---

## 🎉 Done! What's Next?

### ✅ You Now Have:

- Automated testing on every PR
- Code quality checks
- Security scanning
- Docker builds
- Dependabot updates

### 🚀 Next Steps:

1. **Configure Deployment** (optional)
   - Set up staging environment
   - Configure production secrets
   - See [CI_CD_SETUP.md](../CI_CD_SETUP.md#deployment)

2. **Enable Dependabot**
   - Go to **Settings** → **Code security**
   - Enable **Dependabot alerts**
   - Enable **Dependabot security updates**

3. **Enable CodeQL** (optional)
   - **Settings** → **Code security**
   - Enable **CodeQL analysis**

4. **Add Slack Notifications** (optional)
   ```bash
   gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/..."
   ```

5. **Customize Workflows**
   - Edit `.github/workflows/*.yml`
   - Adjust timeouts, thresholds, etc.

---

## 🐛 Troubleshooting

### CI Failing?

**Check logs:**
```bash
gh run view --log-failed
```

**Re-run failed jobs:**
```bash
gh run rerun --failed
```

### Common Issues:

#### 1. Missing Secrets
```
Error: DATABASE_URL is not set
```
**Fix:**
```bash
gh secret set DATABASE_URL --body "postgresql://..."
```

#### 2. Permission Denied
```
Error: Resource not accessible by integration
```
**Fix:** Enable read/write permissions in Settings → Actions

#### 3. Tests Failing
```
Error: Cannot connect to database
```
**Fix:** Tests use local PostgreSQL service. Check test configuration.

---

## 📚 Full Documentation

For detailed information, see:
- [CI/CD Setup Guide](../CI_CD_SETUP.md)
- [Audit Report](../AUDIT_REPORT.md)
- [Critical Fixes Checklist](../CRITICAL_FIXES_CHECKLIST.md)

---

## 💡 Tips

### Speed Up CI

1. **Enable caching:**
   - Already configured in workflows ✅

2. **Run jobs in parallel:**
   - Already configured ✅

3. **Use matrix strategy:**
   - Already configured ✅

### Keep CI Green

1. **Run tests locally first:**
   ```bash
   npm test
   npm run lint
   npx tsc --noEmit
   ```

2. **Use pre-commit hooks:**
   ```bash
   npm run prepare  # Install husky hooks
   ```

3. **Fix issues immediately:**
   - Don't merge failing PRs
   - Fix broken main ASAP

### Save GitHub Actions Minutes

1. **Skip CI when not needed:**
   ```bash
   git commit -m "docs: update README [skip ci]"
   ```

2. **Use concurrency groups:**
   - Already configured ✅
   - Cancels outdated runs automatically

3. **Optimize test suite:**
   - Run unit tests first
   - Run integration tests only on main
   - Use test result caching

---

## 🎯 Success Checklist

After setup, verify:

- [ ] All secrets are configured
- [ ] Branch protection is enabled
- [ ] Test PR passes CI
- [ ] Dependabot is enabled
- [ ] Team members have access
- [ ] Documentation is up to date
- [ ] Deployment workflow tested (if applicable)

---

**Time invested:** 15 minutes
**Time saved:** Hours per week!

Happy automating! 🎉
