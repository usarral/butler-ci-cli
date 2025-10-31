# Contributing Guide

Thank you for your interest in contributing to Butler CI CLI! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Environment Setup](#environment-setup)
- [Development Process](#development-process)
- [Style Guide](#style-guide)
- [Commits](#commits)
- [Pull Requests](#pull-requests)

## 📜 Code of Conduct

This project adheres to professional conduct standards. By participating, you are expected to maintain a respectful and collaborative environment.

## 🚀 How Can I Contribute?

### Reporting Bugs

If you find a bug, open an issue with:

- **Descriptive title**: Summarize the problem in a few words
- **Detailed description**: Explain what happened and what you expected
- **Steps to reproduce**:
  1. Step 1
  2. Step 2
  3. ...
- **Environment information**:
  - Butler CI CLI version
  - Node.js version (`node --version`)
  - Operating system
  - Jenkins version
- **Logs or error messages**: If available

### Suggesting Enhancements

Feature suggestions are welcome:

- Open an issue with the `enhancement` tag
- Describe the feature and its use case
- Explain how it would improve the user experience
- Provide usage examples if possible

### Contributing Code

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/butler-ci-cli.git
   cd butler-ci-cli
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/bug-fix
   ```
4. **Make your changes**
5. **Run tests**:
   ```bash
   pnpm test:run
   ```
6. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: feature description"
   git push origin feature/my-new-feature
   ```
7. **Open a Pull Request**

## 🛠️ Environment Setup

### Prerequisites

- Node.js >= 16
- pnpm (recommended) or npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/usarral/butler-ci-cli.git
cd butler-ci-cli

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev
```

### Jenkins Configuration for Testing

To test locally, you'll need access to a Jenkins server:

1. Configure credentials:
   ```bash
   butler-ci-cli config create
   ```

2. Or use environment variables:
   ```bash
   export JENKINS_URL="https://your-jenkins-server.com"
   export JENKINS_USER="your-username"
   export JENKINS_TOKEN="your-api-token"
   ```

## 💻 Development Process

### Project Structure

```
src/
├── commands/          # CLI commands
│   ├── config/       # Configuration commands
│   ├── build.ts      # build command
│   ├── fetchJobs.ts  # fetch-jobs command
│   └── ...
├── utils/            # Utilities
│   ├── jenkinsClient.ts  # Jenkins client
│   ├── config.ts         # Config management
│   └── ...
└── index.ts          # Entry point
```

### Adding a New Command

1. **Create the command file** in `src/commands/`:

```typescript
// src/commands/myCommand.ts
import { getJenkinsClient } from "../utils/jenkinsClient";
import chalk from "chalk";

export async function myCommand(arg: string) {
  try {
    const client = await getJenkinsClient();
    
    // Your logic here
    console.log(chalk.green("✅ Command executed successfully"));
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error.message);
    process.exit(1);
  }
}
```

2. **Register the command** in `src/index.ts`:

```typescript
import { myCommand } from "./commands/myCommand";

program
  .command("my-command")
  .argument("<argument>", "Argument description")
  .option("-o, --option", "Option description")
  .description("Command description")
  .action(myCommand);
```

3. **Add tests** in `tests/`:

```typescript
// tests/myCommand.test.ts
import { describe, it, expect } from "vitest";

describe("myCommand", () => {
  it("should work correctly", () => {
    // Your test here
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

## 🎨 Style Guide

### TypeScript

- Use explicit types whenever possible
- Avoid `any`, prefer specific types or `unknown`
- Interfaces for complex objects
- Name interfaces with PascalCase

```typescript
// ✅ Good
interface JobInfo {
  name: string;
  url: string;
  buildable: boolean;
}

function getJobInfo(jobName: string): Promise<JobInfo> {
  // ...
}

// ❌ Avoid
function getJobInfo(jobName: any): any {
  // ...
}
```

### Formatting

- Use 2 spaces for indentation
- Semicolons at the end of statements
- Double quotes for strings
- Trailing comma in multiline objects and arrays

```typescript
// ✅ Good
const config = {
  url: "https://example.com",
  user: "admin",
  token: "secret",
};

// ❌ Avoid
const config = {
  url: 'https://example.com',
  user: 'admin',
  token: 'secret'
}
```

### User Messages

- Use emojis to improve readability:
  - ✅ Success
  - ❌ Error
  - ⚠️  Warning
  - 📋 Information
  - 🔍 Search
  - 🚀 Start/Execution
  - 📁 Folders
  - 🔹 Items/Jobs

```typescript
// ✅ Good
console.log(chalk.green("✅ Build started successfully"));
console.log(chalk.yellow("⚠️  The job has no parameters"));
console.error(chalk.red("❌ Error connecting to Jenkins"));

// ❌ Avoid
console.log("Build started");
console.log("Warning: no params");
console.error("Error");
```

### Error Handling

- Always catch errors in try-catch blocks
- Provide descriptive error messages
- Use `process.exit(1)` for fatal errors

```typescript
// ✅ Good
try {
  const result = await client.get(url);
  return result.data;
} catch (error) {
  if (error.response?.status === 404) {
    console.error(chalk.red("❌ Job not found"));
  } else {
    console.error(chalk.red("❌ Error querying Jenkins:"), error.message);
  }
  process.exit(1);
}
```

## 📝 Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:

**Important**: Commit messages are used by our automated release system to determine version bumps. Please use conventional commit format for all commits to master.

### Format

```
<type>[optional scope][!]: <short description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature (triggers minor version bump)
- `fix`: Bug fix (triggers patch version bump)
- `docs`: Documentation changes (triggers patch version bump)
- `style`: Formatting changes (triggers patch version bump)
- `refactor`: Code refactoring (triggers patch version bump)
- `test`: Add or modify tests (triggers patch version bump)
- `chore`: Maintenance tasks (triggers patch version bump)
- `feat!` or `BREAKING CHANGE`: Breaking changes (triggers major version bump)

### Version Bumping

The automated release system determines version bumps based on commit messages:

- **Major** (x.0.0): `feat!:`, `fix!:`, or commits with `BREAKING CHANGE` footer
- **Minor** (x.y.0): `feat:` or `feat(scope):`
- **Patch** (x.y.z): `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`

See [Automated Releases](docs/AUTOMATED_RELEASES.md) for more details.

### Examples

```bash
# New feature (minor bump: 3.0.0 → 3.1.0)
git commit -m "feat(commands): add metrics viewing command"

# Bug fix (patch bump: 3.0.0 → 3.0.1)
git commit -m "fix(jenkins): fix parameter encoding in URLs"

# Documentation (patch bump: 3.0.0 → 3.0.1)
git commit -m "docs(readme): update usage examples"

# Refactoring (patch bump: 3.0.0 → 3.0.1)
git commit -m "refactor(config): simplify validation logic"

# Tests (patch bump: 3.0.0 → 3.0.1)
git commit -m "test(jenkins): add tests for jenkinsClient"

# Breaking change (major bump: 3.0.0 → 4.0.0)
git commit -m "feat!: redesign CLI interface"

# Breaking change with footer (major bump: 3.0.0 → 4.0.0)
git commit -m "feat: change config format

BREAKING CHANGE: config format changed from JSON to YAML"
```

## 🔀 Pull Requests

### Before Submitting

1. ✅ Tests pass (`pnpm test:run`)
2. ✅ Code compiles without errors (`pnpm build`)
3. ✅ Code follows the style guide
4. ✅ Commits follow the convention
5. ✅ Documentation is updated (if applicable)

### PR Template

```markdown
## Description
Clear description of the changes made.

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## How has this been tested?
Describe the tests you performed.

## Checklist
- [ ] Tests pass
- [ ] Code compiles
- [ ] Documentation updated
- [ ] Commits follow convention
```

### Review

- PRs will be reviewed by maintainers
- Changes may be requested
- Once approved, it will be merged by a maintainer

## 🎯 Contribution Areas

### High Priority

- Improve test coverage
- Additional documentation and examples
- Support for more Jenkins job types
- Improvements in error handling

### Ideas for New Features

- Interactive dashboard in terminal
- Support for Jenkins multibranch pipelines
- Webhooks and notifications
- Export reports in different formats
- Integration with other CI/CD tools

## 📞 Contact

If you have questions about contributing:

- Open an issue with the `question` label
- Check existing issues with `good first issue`

Thank you for contributing to Butler CLI! 🎉
