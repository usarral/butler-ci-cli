# Release Workflow Example

This document demonstrates how the automated release workflow operates with real examples.

## Scenario 1: Feature Addition (Minor Version Bump)

### Developer commits a feature

```bash
# On feature branch
git checkout -b feature/add-export-command
# ... make changes ...
git commit -m "feat: add config export command"
git push origin feature/add-export-command
```

### Create and merge PR

1. Create PR on GitHub
2. CI runs tests (pr-ci-deps.yaml)
3. Review and approve
4. Merge to master (squash merge recommended)

### Automated Release Process

When the commit lands on master:

**Commit message on master:** `feat: add config export command`

**Automated actions:**

1. ✅ Workflow triggered by push to master
2. ✅ Tests run and pass
3. ✅ Build completes successfully
4. ✅ Version bumped: `3.0.0` → `3.1.0`
5. ✅ Commit created: `chore(release): bump version to 3.1.0 [skip ci]`
6. ✅ GitHub release created: `v3.1.0`
7. ✅ Package published to npm: `butler-ci-cli@3.1.0`

**Result:** New version `3.1.0` available on npm

---

## Scenario 2: Bug Fix (Patch Version Bump)

### Developer commits a fix

```bash
git checkout -b fix/null-response-handling
# ... fix the bug ...
git commit -m "fix: handle null responses in Jenkins API"
git push origin fix/null-response-handling
```

### Merge to master

**Commit message on master:** `fix: handle null responses in Jenkins API`

**Automated actions:**

1. ✅ Workflow triggered
2. ✅ Tests pass
3. ✅ Version bumped: `3.1.0` → `3.1.1`
4. ✅ Release created: `v3.1.1`
5. ✅ Published to npm: `butler-ci-cli@3.1.1`

**Result:** New version `3.1.1` available on npm

---

## Scenario 3: Breaking Change (Major Version Bump)

### Developer commits a breaking change

```bash
git checkout -b feat/redesign-cli
# ... make breaking changes ...
git commit -m "feat!: redesign CLI interface with new command structure

BREAKING CHANGE: Command structure changed from noun-verb to verb-noun"
git push origin feat/redesign-cli
```

### Merge to master

**Commit message on master:** `feat!: redesign CLI interface with new command structure`

**Automated actions:**

1. ✅ Workflow triggered
2. ✅ Tests pass
3. ✅ Version bumped: `3.1.1` → `4.0.0`
4. ✅ Release created: `v4.0.0`
5. ✅ Published to npm: `butler-ci-cli@4.0.0`

**Result:** New major version `4.0.0` available on npm

---

## Scenario 4: Documentation Update (Patch Version Bump)

### Developer updates docs

```bash
git checkout -b docs/improve-readme
# ... update README ...
git commit -m "docs: improve installation instructions"
git push origin docs/improve-readme
```

### Merge to master

**Commit message on master:** `docs: improve installation instructions`

**Note:** If the changes are **only** to markdown files in docs/, the workflow will NOT trigger due to `paths-ignore`. However, if there are also code changes, it will trigger.

**Automated actions (if triggered):**

1. ✅ Workflow triggered
2. ✅ Tests pass
3. ✅ Version bumped: `4.0.0` → `4.0.1`
4. ✅ Release created: `v4.0.1`
5. ✅ Published to npm: `butler-ci-cli@4.0.1`

---

## Scenario 5: Multiple Commits (Squash Merge)

### Multiple commits on feature branch

```bash
git checkout -b feature/new-commands
git commit -m "wip: start new commands"
git commit -m "wip: add tests"
git commit -m "feat: add batch command support"
git commit -m "fix typo"
git push origin feature/new-commands
```

### Merge PR with squash

When using GitHub's "Squash and merge" option:

**Combined commit message:** `feat: add batch command support`

Only the squashed commit message matters for version determination.

**Automated actions:**

1. ✅ Version bumped: `4.0.1` → `4.1.0` (minor bump due to `feat:`)
2. ✅ Release `v4.1.0` created
3. ✅ Published to npm

---

## Scenario 6: Workflow Failure Handling

### Tests fail during release

```bash
git commit -m "feat: add new feature"
# Merge to master
```

**Automated actions:**

1. ✅ Workflow triggered
2. ❌ Tests fail
3. ❌ Workflow stops - no version bump, no release, no publish

**Developer actions:**

1. Check GitHub Actions logs
2. Fix the failing tests
3. Push fix to master:
   ```bash
   git commit -m "fix: resolve test failures"
   git push origin master
   ```
4. New workflow run triggers and succeeds

---

## Scenario 7: Emergency Hotfix

### Critical bug in production

```bash
# Work directly or via fast PR
git checkout -b hotfix/critical-security-fix
git commit -m "fix!: patch critical security vulnerability

BREAKING CHANGE: removes deprecated insecure authentication method"
git push origin hotfix/critical-security-fix
```

### Merge immediately after review

**Commit message on master:** `fix!: patch critical security vulnerability`

**Automated actions:**

1. ✅ Workflow triggered immediately on merge
2. ✅ Tests pass
3. ✅ Version bumped: `4.1.0` → `5.0.0` (major due to `!`)
4. ✅ Release created within minutes
5. ✅ Published to npm automatically

**Result:** Critical fix deployed to npm in minutes, not hours

---

## Timeline Example

**10:00 AM** - Developer merges PR with `feat: add export command`  
**10:01 AM** - GitHub Actions workflow starts  
**10:02 AM** - Dependencies installed and cached  
**10:03 AM** - Tests run and pass  
**10:03 AM** - Build completes  
**10:03 AM** - Version bumped to 3.1.0  
**10:04 AM** - GitHub release v3.1.0 created  
**10:04 AM** - Package published to npm  
**10:05 AM** - Users can install `butler-ci-cli@3.1.0`

**Total time: ~5 minutes from merge to availability**

---

## Monitoring the Release

### GitHub Actions

1. Go to repository → Actions tab
2. See "Automated Release on Master" workflow
3. Click on latest run to see detailed logs

### GitHub Releases

1. Go to repository → Releases
2. See all published versions
3. View auto-generated release notes

### NPM Registry

1. Visit https://www.npmjs.com/package/butler-ci-cli
2. See latest published version
3. Check version history

### Verify Installation

```bash
# Check latest version
npm view butler-ci-cli version

# Install latest
npm install -g butler-ci-cli@latest

# Verify
butler-ci-cli --version
```

---

## Best Practices Demonstrated

1. **Conventional Commits** - Clear, semantic commit messages
2. **Squash Merges** - Clean git history with meaningful commits
3. **Fast Feedback** - Automated testing prevents bad releases
4. **Zero Manual Steps** - From merge to npm in minutes
5. **Transparency** - All actions visible in GitHub Actions logs
6. **Rollback Ready** - Git tags and releases enable easy rollback if needed

---

## Troubleshooting Examples

### Problem: Wrong version bumped

**Scenario:** Committed `chore: update deps` but it bumped as patch when you wanted no release.

**Solution:** 
- Commits to master always trigger releases
- Use paths-ignore or [skip ci] if you truly don't want a release
- Consider if dependency updates deserve a patch version

### Problem: Release failed at publish step

**Scenario:** Everything worked but npm publish failed.

**Solution:**
1. Check NPM_TOKEN secret is valid
2. Check npm registry status
3. Manually trigger publish.yml workflow as fallback

### Problem: Forgot to use conventional commit format

**Scenario:** Merged with commit `added new feature`.

**Solution:**
- Release will still trigger (defaults to patch)
- For future: enforce conventional commits via PR checks
- Can add commitlint to catch this earlier

---

## Summary

The automated release workflow:

- ✅ Removes manual version management
- ✅ Ensures consistent releases
- ✅ Speeds up deployment (5 minutes vs. hours)
- ✅ Reduces human error
- ✅ Provides full automation and traceability
- ✅ Maintains security with branch protection and secrets
