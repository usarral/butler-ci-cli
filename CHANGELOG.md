# Changelog

All notable changes to Butler CI CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
 
### Planned
- Interactive dashboard in terminal
- Support for multibranch pipelines
- Webhooks and notifications
- Export reports in different formats
- Integration with other CI/CD tools

## [3.0.0] - 2025-10-31

### Changed
- **BREAKING CHANGE**: Renamed project from `butler-cli` to `butler-ci-cli`
  - Package name changed to `butler-ci-cli`
  - Command renamed to `butler-ci-cli`
  - Configuration directory changed from `~/.butler-cli` to `~/.butler-ci-cli`
  - Repository URL updated to `https://github.com/usarral/butler-ci-cli`
- All documentation updated to reflect the new name
- Updated all references across the codebase

### Migration Guide
- Uninstall old version: `npm uninstall -g butler-cli`
- Install new version: `npm install -g butler-ci-cli`
- Migrate configurations manually from `~/.butler-cli` to `~/.butler-ci-cli` if needed

## [2.0.0] - 2025-10-31

### Added
- English documentation sweep (README, docs/ARCHITECTURE.md, docs/JENKINS_API.md)
- GitHub Actions workflow and publishing configuration for npm

### Changed
- Bumped package version to 2.0.0


### Added
- Complete configuration management system
  - Create, list, use, delete configurations
  - Support for multiple Jenkins servers
  - Persistent active configuration
  - Fallback to environment variables
- Customizable preferences system
  - Preferred editor for files
  - Specific log viewer
  - Customizable directory for downloads
- Configuration commands:
  - `config create` - Create new configuration
  - `config list` / `config ls` - List configurations
  - `config use` - Switch active configuration
  - `config current` - View current configuration
  - `config delete` / `config rm` - Delete configuration
  - `config edit` - Edit preferences
- Query commands:
  - `fetch-jobs` - Fetch and save job list
  - `list-jobs` - Show jobs with hierarchical structure
  - `show-folders` - Show folder structure only
  - `search-jobs` - Search jobs by name
  - `job-info` - Detailed job information
  - `last-build` - Last build information
  - `job-params` - View job parameters
- Action commands:
  - `build` - Execute builds in assisted manner
  - `logs` - View, download or open build logs
- Full support for Jenkins folders and subfolders
  - Recursive structure navigation
  - Automatic path conversion
  - Hierarchical visualization
- Command options:
  - `--folders` in `list-jobs` to include folders
  - `--max-level` to limit visualization depth
  - `--download` / `-d` to download logs
  - `--editor` / `-e` to open logs in editor
  - `--output` / `-o` to specify download path
  - `--params` to pass parameters to builds
- UX features:
  - Colorful interface with chalk
  - Emojis for better readability
  - Interactive prompts with inquirer
  - Autocomplete for saved jobs
  - Descriptive error messages
- Utilities:
  - Configurable HTTP client for Jenkins API
  - Duration and timestamp formatting
  - Local storage management
  - Configuration validation
- Testing:
  - Test suite with Vitest
  - Code coverage
  - Jenkins API mocks
  - Unit and integration tests
- Documentation:
  - Complete README with examples
  - Contributing guide (CONTRIBUTING.md)
  - Architecture documentation (docs/ARCHITECTURE.md)
  - Jenkins API guide (docs/JENKINS_API.md)
  - Publishing guide (docs/PUBLISHING.md)
- CI/CD:
  - GitHub Action to publish to npm
  - Automatic execution on releases
  - Manual publication option

### Technical Changes
- Migration to TypeScript
- Use of Commander.js for CLI
- Axios for HTTP requests
- Inquirer for interactive prompts
- Chalk for terminal colors
- Pino for logging (internal)
- Vitest for testing
- Build with TypeScript compiler

### Security
- Use of API tokens instead of passwords
- Local storage of configurations
- Basic Auth authentication with Jenkins
- Credentials validation

## [0.1.0] - 2025-09-15 (Initial Version)

### Added
- Initial CLI prototype
- Basic commands to query Jenkins
- Support for environment variables

---

## Types of Changes

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Features that will be removed
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security vulnerabilities fixed

[Unreleased]: https://github.com/usarral/butler-ci-cli/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/usarral/butler-ci-cli/releases/tag/v1.0.0
[0.1.0]: https://github.com/usarral/butler-ci-cli/releases/tag/v0.1.0
