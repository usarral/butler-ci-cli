# Automated Releases

This document describes the automated release workflow for Butler CI CLI.

## Overview

Butler CI CLI uses an automated release workflow that triggers on every push to the `master` branch. The workflow automatically:

1. Analyzes commit messages using conventional commit format
2. Determines the appropriate version bump (major, minor, or patch)
3. Updates the package version
4. Creates a GitHub release
5. Publishes the package to npm

## Conventional Commits

The automated release system uses [Conventional Commits](https://www.conventionalcommits.org/) to determine how to bump the version.

### Version Bump Rules

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat!:`, `fix!:`, `BREAKING CHANGE` | **Major** (x.0.0) | `feat!: remove deprecated API` |
| `feat:` or `feat(scope):` | **Minor** (x.y.0) | `feat: add new command` |
| `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:` | **Patch** (x.y.z) | `fix: correct error handling` |

### Commit Message Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**

- `feat: add config export command` → Minor version bump (3.0.0 → 3.1.0)
- `fix: handle null responses correctly` → Patch version bump (3.0.0 → 3.0.1)
- `feat!: redesign CLI interface` → Major version bump (3.0.0 → 4.0.0)
- `chore: update dependencies` → Patch version bump (3.0.0 → 3.0.1)

## Workflow Triggers

The automated release workflow triggers on:

- **Push to master branch** (including merged pull requests)

The workflow **does not trigger** for changes to:

- Markdown files (`**.md`)
- Documentation folder (`docs/**`)
- LICENSE file
- `.gitignore`
- `renovate.json`

## Workflow Steps

### 1. Code Checkout and Setup

- Checks out the full repository history
- Sets up Node.js 24
- Installs pnpm 10.20.0
- Configures caching for dependencies

### 2. Quality Checks

- Installs project dependencies
- Runs all tests (`pnpm test:run`)
- Builds the project (`pnpm build`)

**Note:** The release only proceeds if all tests pass.

### 3. Version Determination

- Analyzes the last commit message
- Applies conventional commit rules
- Calculates the new version number

### 4. Version Update

- Updates `package.json` with the new version
- Commits the version change with message: `chore(release): bump version to X.Y.Z [skip ci]`
- Pushes the commit to master

**Note:** The `[skip ci]` tag prevents infinite loops.

### 5. GitHub Release Creation

- Creates a new Git tag (`vX.Y.Z`)
- Generates a GitHub release with:
  - Release title: `Release vX.Y.Z`
  - Auto-generated changelog
  - Comparison link to previous version

### 6. NPM Publication

- Publishes the package to npm registry
- Uses the `NPM_TOKEN` secret for authentication
- Makes the package publicly available

## Security Considerations

### Branch Protection

The workflow only runs on the `master` branch, ensuring:

- Only reviewed and approved code gets released
- All changes go through pull request process
- CI checks must pass before merging

### Required Secrets

The workflow requires the following GitHub secrets:

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions (for releases)
- `NPM_TOKEN` - Must be configured manually (for npm publishing)

### Permissions

The workflow requires the following permissions:

- `contents: write` - To create releases and push version commits
- `pull-requests: write` - For future enhancement capabilities
- `id-token: write` - For secure npm publishing

## Best Practices

### For Contributors

1. **Use conventional commit messages** for all commits
2. **Squash merge PRs** to maintain clean commit history
3. **Write descriptive commit messages** that explain the change
4. **Mark breaking changes** with `!` or `BREAKING CHANGE` footer

### For Maintainers

1. **Review commit messages** before merging PRs
2. **Ensure tests pass** before merging to master
3. **Monitor GitHub Actions** for workflow failures
4. **Verify npm publication** after each release

## Troubleshooting

### Release Failed

If the automated release fails:

1. Check the GitHub Actions logs for errors
2. Verify all tests pass locally
3. Ensure `NPM_TOKEN` secret is valid
4. Check npm registry status

### Wrong Version Bump

If the version was bumped incorrectly:

1. Review the commit message that triggered the release
2. Consider reverting the release commit
3. Make a new commit with the correct conventional commit format

### NPM Publication Failed

If the package didn't publish to npm:

1. Check the `NPM_TOKEN` secret is valid and not expired
2. Verify you have publish permissions on npm
3. Check for npm registry issues
4. Re-run the workflow manually if needed

## Manual Release (Fallback)

If automated releases fail, you can still release manually:

### Option 1: Using GitHub Release (triggers existing workflow)

1. Update version in `package.json`
2. Commit and push changes
3. Create a release on GitHub
4. The `publish.yml` workflow will handle npm publication

### Option 2: Using Manual Workflow Dispatch

1. Go to Actions → "Publish to npm"
2. Click "Run workflow"
3. Specify version or leave empty to use `package.json` version
4. Execute the workflow

## Monitoring

### Check Release Status

- **GitHub**: Go to Actions tab to see workflow runs
- **NPM**: Check [npmjs.com/package/butler-ci-cli](https://www.npmjs.com/package/butler-ci-cli)
- **Releases**: View all releases at [GitHub Releases](https://github.com/usarral/butler-ci-cli/releases)

### Notifications

GitHub Actions will:

- Send notifications on workflow failures
- Update PR status checks
- Create release notifications

## Future Enhancements

Planned improvements to the automated release system:

- [ ] Automatic changelog generation from commit history
- [ ] Slack/Discord notifications for new releases
- [ ] Rollback capabilities for failed releases
- [ ] Pre-release and beta version support
- [ ] Release notes enhancement with issue links
- [ ] Automatic migration guide generation for major versions

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/cli/v9/commands/npm-publish)
