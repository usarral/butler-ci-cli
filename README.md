# Butler CI CLI

[![npm version](https://img.shields.io/npm/v/butler-ci-cli.svg)](https://www.npmjs.com/package/butler-ci-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

🤖 A command-line tool to interact with Jenkins Pipelines in a simple and efficient way.

## 📋 Description

Butler CI CLI is a terminal application that allows you to manage and monitor Jenkins jobs through simple commands. It makes it easy to query information about pipelines, builds, and their status without needing to access the Jenkins web interface.

## ⚡ Features

- 📋 List all available jobs in Jenkins (including folders and subfolders)
- 🔍 Get detailed information about a specific job (supports folder paths)
- 🔄 Query the last build of a job
- 📊 List builds with filtering (by status, date range), pagination, and sorting
- 💾 Save job list locally for future references
- 🗂️ Navigate through Jenkins folder structure
- 🔍 Search jobs by name across the entire structure
- 📁 Visualize folder structure
- 🎨 Colorful and user-friendly terminal interface
- 📋 Query required parameters for jobs
- 🚀 Execute builds in an assisted manner (interactive or with CLI parameters)
- 🛑 Abort running builds
- 🚦 Launch several jobs with a cap on how many run at once, freeing a slot when each reaches a target state
- 📄 View and download build logs
- 🔄 Stream logs in real-time with configurable refresh intervals
- ✏️ Open logs in configurable editors
- ⚙️ Customizable preferences system (editor, log viewer, directory)
- 🔍 View workflow steps and stages of job executions
- 🤖 MCP server to drive Jenkins from Claude, OpenCode and other AI clients

## 🛠️ Installation

### Prerequisites

- Node.js (version 16 or higher)
- pnpm (recommended) or npm
- Access to a Jenkins server with API credentials

### Installation from source

1. Clone the repository:
```bash
git clone https://github.com/usarral/butler-ci-cli.git
cd butler-ci-cli
```

2. Install dependencies:
```bash
# With npm
npm install

# With pnpm  
pnpm install

# With yarn
yarn install
```

3. Build the project:
```bash
npm run build
# or
pnpm build
```

4. Install globally (optional):
```bash
# With npm
npm install -g .

# With pnpm
pnpm install -g .

# With yarn
yarn global add .
```

### Installation from npm

```bash
# With npm
npm install -g butler-ci-cli

# With pnpm
pnpm install -g butler-ci-cli

# With yarn
yarn global add butler-ci-cli
```

### Update notifications

When a newer version is published on npm, the CLI prints a notice on stderr after the command finishes. The latest version is checked in the background at most once a day (cached in `~/.butler-ci-cli/update-check.json`), so commands are never slowed down. The notice is skipped when stderr is not a terminal, in CI, and in `butler-ci-cli mcp`. To disable it entirely, set `BUTLER_NO_UPDATE_CHECK=1` (or `NO_UPDATE_NOTIFIER=1`).

### Debug mode

When a command fails and you cannot tell whether it is Jenkins, the network or the CLI, run it with `--debug` (anywhere on the command line) or set `BUTLER_DEBUG=1`:

```bash
butler-ci-cli list-jobs --debug
BUTLER_DEBUG=1 butler-ci-cli jobs info my-job
```

It prints, on **stderr** (so `2> debug.log` works and stdout stays clean), the version, the active configuration (the token is never shown, only its length), every HTTP request and response with status and timing, a diagnosis of failures (connection refused, unknown host, TLS, 401/403/404/5xx, an HTML login page instead of JSON) and a final verdict:

```
[debug] → GET http://127.0.0.1:8099/api/json
[debug] ✗ ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:8099  (19 ms)
[debug]   Nothing is listening at that host and port. Is Jenkins running? Is the URL (and port) right?
[debug] 1 request(s), 1 failed, 0 unexpected answer(s), 1 error(s) reported by the command
[debug] Verdict: at least one request failed, so the problem is on the Jenkins/network side (see the ✗ lines above).
```

Request bodies and command arguments are never printed (only the names of form fields). Debug output is in English regardless of the language setting.

### Language

The CLI picks its language from `BUTLER_LANG` (`en` or `es`), then from the system locale (`LC_ALL`, `LC_MESSAGES`, `LANG`), and falls back to English. All command output, prompts and `--help` descriptions are translated. Not translated: the labels built into Commander's help (`Usage:`, `Options:`), the `--debug` output, and the instructions the MCP server sends to the model.

## ⚙️ Configuration

Butler CI CLI uses a file-based configuration system that allows you to manage multiple Jenkins servers easily. Configurations are stored in your home directory (`~/.butler-ci-cli/configs/`).

### Configuration Management

#### Create a new configuration

```bash
butler-ci-cli config create
```

The command will guide you step by step to create a new configuration:
- **Name**: Unique identifier for the configuration
- **URL**: Jenkins server address
- **User**: Your Jenkins username
- **Token**: Jenkins API token
- **Description**: Optional description
- **Activate**: Whether to set as active configuration

#### List configurations
```bash
butler-ci-cli config list
# or use the alias
butler-ci-cli config ls
```

Shows all available configurations with the active one marked.

#### Use a configuration

```bash
butler-ci-cli config use <name>
```

Sets a configuration as active for use in Jenkins commands.

#### View current configuration

```bash
butler-ci-cli config current
```

Shows the currently active configuration.

#### Delete a configuration

```bash
butler-ci-cli config delete [name]
# or use the alias
butler-ci-cli config rm [name]
```

If you don't specify the name, it will show you a list to select from.

### Get Jenkins Token

1. Go to your Jenkins profile → Configure
2. In the "API Token" section, generate a new token
3. Use this token when creating the configuration

### Compatibility with environment variables

For compatibility, Butler CI CLI will still work with environment variables if you don't have configurations:

```bash
export JENKINS_URL="https://your-jenkins-server.com"
export JENKINS_USER="your-username"
export JENKINS_TOKEN="your-api-token"
```

### Output and logs

By default the CLI prints its output as-is: no `[time] INFO:` prefix in front of
job trees, summaries or tables. Only `WARN` and `ERROR` keep a visible label.

If you need timestamps for troubleshooting, they are rendered in the **system
local timezone**:

```bash
BUTLER_LOG_TIMESTAMPS=1 butler-ci-cli list-jobs   # timestamps at any level
LOG_LEVEL=debug butler-ci-cli list-jobs           # debug traces + timestamps
```

### Icons

Output is always written as UTF-8 through the terminal's native text API, so
accents and icons render correctly on Windows regardless of the active code
page (`chcp`).

Which icon set is used depends on the terminal:

| Terminal | Icons |
| --- | --- |
| macOS / Linux | emoji |
| Windows Terminal, VS Code, ConEmu, Git Bash | emoji |
| Classic Windows console (`conhost`) | plain ASCII |

The classic console draws emoji with inconsistent widths, which breaks the
alignment of job trees and tables, so it gets an ASCII set instead. Override
the detection with `BUTLER_ICONS`:

```bash
BUTLER_ICONS=ascii butler-ci-cli config ls   # force plain ASCII
BUTLER_ICONS=emoji butler-ci-cli config ls   # force emoji
```

## 🚀 Usage

### Configuration Commands

#### `config create`
Creates a new Jenkins configuration interactively.

#### `config list` / `config ls`
Lists all available configurations.

#### `config use <name>`
Sets a configuration as active.

#### `config current`
Shows the currently active configuration.

#### `config delete [name]` / `config rm [name]`
Deletes a configuration (with confirmation).

#### `config edit [name]`
Edits configuration preferences (editor, log viewer, download directory).

### Jenkins Commands

#### General Commands

##### `fetch-jobs`
Downloads and saves the list of all available jobs in Jenkins, including those within folders and subfolders.

```bash
butler-ci-cli fetch-jobs
```

##### `list-jobs`
Shows all available jobs in Jenkins with hierarchical folder structure.

```bash
butler-ci-cli list-jobs
butler-ci-cli list-jobs --folders           # Include folders in the view
butler-ci-cli list-jobs --max-level 2      # Limit depth
```

##### `show-folders`
Shows only the Jenkins folder structure.

```bash
butler-ci-cli show-folders
butler-ci-cli show-folders --max-level 3
```

##### `search-jobs`
Searches for jobs by name across the entire Jenkins structure.

```bash
butler-ci-cli search-jobs <searchTerm>
```

#### Jobs Commands

All job-related operations are now organized under the `jobs` command:

##### `jobs info <jobName>`
Gets detailed information about a specific job. Supports folder paths.

```bash
butler-ci-cli jobs info my-pipeline-job
butler-ci-cli jobs info frontend/build-app
butler-ci-cli jobs info backend/microservices/user-service

# Deprecated (still works with warning):
butler-ci-cli job-info my-pipeline-job
```

##### `jobs last-build <jobName>`
Shows information about the last executed build of a job. Supports folder paths.

```bash
butler-ci-cli jobs last-build my-pipeline-job
butler-ci-cli jobs last-build frontend/build-app

# Deprecated (still works with warning):
butler-ci-cli last-build my-pipeline-job
```

##### `jobs params <jobName>`
Shows the parameters a job needs to run, including their default values.

```bash
butler-ci-cli jobs params my-pipeline-job

# Deprecated (still works with warning):
butler-ci-cli job-params my-pipeline-job
```

##### `jobs steps <jobName> <buildNumber|latest>`
Shows the individual steps of a given job's build execution. Displays stages and their steps with status, duration, and error details (if any).

```bash
# View steps of a specific build
butler-ci-cli jobs steps my-pipeline-job 42

# View steps of the latest build
butler-ci-cli jobs steps my-pipeline-job latest

# Works with folder paths
butler-ci-cli jobs steps backend/api-service 123

# Deprecated (still works with warning):
butler-ci-cli job-steps my-pipeline-job 42
```

##### `jobs build <jobName>`
Executes a build of a job in an assisted manner. The command will interactively request values for each required parameter.

```bash
butler-ci-cli jobs build my-pipeline-job

# You can also pass parameters directly via CLI
butler-ci-cli jobs build my-job --params "ENVIRONMENT=production,VERSION=1.2.3"

# Deprecated (still works with warning):
butler-ci-cli build my-job --params "ENVIRONMENT=production,VERSION=1.2.3"
```

##### `jobs abort <jobName> <buildNumber|latest>`
Aborts a build that is currently running. It asks for confirmation first; use `--yes` to skip it. If the build has already finished, nothing is sent to Jenkins.

```bash
butler-ci-cli jobs abort my-job 42
butler-ci-cli jobs abort my-job latest
butler-ci-cli jobs abort my-job 42 --yes   # No confirmation
```

##### `jobs stages <jobName> [buildNumber|latest]`
Lists the stages of a Pipeline build (the latest one by default) with their status. Use it to find the exact stage name for `jobs batch --until stage:<name>`. It needs the Pipeline Stage View plugin (`wfapi`); the job must have run at least once.

```bash
butler-ci-cli jobs stages my-pipeline
butler-ci-cli jobs stages backend/api-service 42
```

##### `jobs batch [jobs...]`
Launches several jobs while keeping at most `--concurrency` of them "in flight". A build stays in flight until it reaches the target state (`--until`); then its slot is freed and the next job in the list is launched. The command waits until every job has reached the target, and exits with code 1 if any did not (or could not be launched).

| `--until` | The slot is freed when... |
| --- | --- |
| `started` | the build leaves the queue and starts running |
| `finished` (default) | the build ends, whatever its result |
| `success` | the build ends with `SUCCESS` |
| `paused` | the build stops at an `input` step waiting for approval (a stage in `PAUSED_PENDING_INPUT`); it stays paused until someone answers |
| `stage:<name>` | the stage `<name>` ends with `SUCCESS`, even if the build keeps running |

A build that can no longer reach the target (e.g. it ended as `FAILURE` while waiting for `success`, or it was removed from the queue) also frees its slot and is reported as not reached; the rest of the batch continues. Jobs are checked before anything is launched, so a typo does not leave the batch half-started. It asks for confirmation unless you pass `--yes`.

```bash
# One at a time (default), each starts when the previous one finishes
butler-ci-cli jobs batch app/build app/test app/deploy

# Two at a time, same parameters for all the jobs given as arguments
butler-ci-cli jobs batch job-a job-b job-c --concurrency 2 --params "ENVIRONMENT=staging" --until success

# Deploy several things up to their approval gate, one after another
butler-ci-cli jobs batch app/deploy-a app/deploy-b --until paused

# Launch the next job as soon as the "Build" stage of the previous one succeeds
butler-ci-cli jobs batch app/one app/two --until "stage:Build"

# Per-job parameters from a manifest (JSON or JSONC: comments allowed)
butler-ci-cli jobs batch --file pipelines.json
```

`pipelines.json` (jobs may also be given as arguments, which run first; flags override the manifest settings, all of which are optional):

```json
{
  "concurrency": 2,
  "until": "success",
  "pollInterval": 5,
  "jobs": [
    "app/build",
    { "job": "app/deploy", "params": { "ENVIRONMENT": "staging", "DRY_RUN": false } }
  ]
}
```

Parameters that are not given use the job's defaults. The poll interval (`--interval`, seconds) defaults to 5.

The manifest is parsed as JSONC, so you can keep a template with all your services and comment out the ones you do not want to launch; see [`docs/examples/batch-template.jsonc`](docs/examples/batch-template.jsonc) and [docs/BATCH.md](docs/BATCH.md).

##### `jobs logs <jobName> <buildNumber|latest>`
View, download, or open logs from a specific build in an editor.

```bash
# View logs in terminal
butler-ci-cli jobs logs my-job 42
butler-ci-cli jobs logs my-job latest

# Stream logs in real-time (refreshes every 5 seconds by default)
butler-ci-cli jobs logs my-job 42 --stream
butler-ci-cli jobs logs my-job latest -s

# Stream with custom refresh interval (in seconds)
butler-ci-cli jobs logs my-job 42 --stream --interval 10
butler-ci-cli jobs logs my-job latest -s -i 3

# Download logs to file
butler-ci-cli jobs logs my-job 42 --download
butler-ci-cli jobs logs my-job latest -d

# Open logs in configured editor
butler-ci-cli jobs logs my-job 42 --editor
butler-ci-cli jobs logs my-job latest -e

# Download to specific location
butler-ci-cli jobs logs my-job 42 --download --output /tmp/build.log

# Deprecated (still works with warning):
butler-ci-cli logs my-job 42 --download --output /tmp/build.log
```

##### `jobs list-builds <jobName>`
Lists all builds for a specified job with support for filtering, pagination, and sorting.

```bash
# List all builds (default: 50 most recent)
butler-ci-cli jobs list-builds my-pipeline-job

# Filter by status
butler-ci-cli jobs list-builds my-job --status SUCCESS
butler-ci-cli jobs list-builds my-job --status FAILURE
butler-ci-cli jobs list-builds my-job --status RUNNING

# Filter by date range
butler-ci-cli jobs list-builds my-job --since 2024-01-01
butler-ci-cli jobs list-builds my-job --since 2024-01-01 --until 2024-12-31

# Pagination
butler-ci-cli jobs list-builds my-job --limit 10
butler-ci-cli jobs list-builds my-job --offset 20 --limit 10

# Sorting
butler-ci-cli jobs list-builds my-job --sort-by timestamp --order asc
butler-ci-cli jobs list-builds my-job --sort-by number --order desc

# Combined filters
butler-ci-cli jobs list-builds my-job --status SUCCESS --since 2024-01-01 --limit 20

# Deprecated (still works with warning):
butler-ci-cli list-builds my-job --status SUCCESS
```

### Example Workflow

```bash
# Create configuration
butler-ci-cli config create              # Create configuration
butler-ci-cli config list               # View configurations
butler-ci-cli config use production     # Switch to production

# Explore Jenkins structure
butler-ci-cli fetch-jobs                # Get all jobs (includes folders)
butler-ci-cli show-folders              # View folder structure only
butler-ci-cli list-jobs --folders       # View jobs and folders

# Search and get specific information
butler-ci-cli search-jobs user          # Search for jobs containing "user"
butler-ci-cli jobs info frontend/build   # Info about job in frontend folder
butler-ci-cli jobs last-build backend/api    # Last build of backend/api job

# View parameters and execute builds
butler-ci-cli jobs params my-pipeline    # View job parameters
butler-ci-cli jobs build my-pipeline         # Execute build (interactive mode)
butler-ci-cli jobs build my-pipeline --params "ENV=prod,VERSION=1.0.0"
butler-ci-cli jobs abort my-pipeline latest  # Abort the running build
butler-ci-cli jobs steps my-pipeline 42  # View steps of build #42
butler-ci-cli jobs steps my-pipeline latest  # View steps of latest build

# List and filter builds
butler-ci-cli jobs list-builds my-job              # List recent builds
butler-ci-cli jobs list-builds my-job --status SUCCESS  # Only successful builds
butler-ci-cli jobs list-builds my-job --since 2024-01-01 --limit 20

# Work with logs
butler-ci-cli jobs logs my-job 42            # View logs in terminal
butler-ci-cli jobs logs my-job latest        # View latest build logs
butler-ci-cli jobs logs my-job latest -s     # Stream logs in real-time
butler-ci-cli jobs logs my-job latest -s -i 3  # Stream with 3 second refresh
butler-ci-cli jobs logs my-job 42 -d         # Download logs
butler-ci-cli jobs logs my-job latest -e     # Open latest build in editor
```

## 🤖 MCP Server

`butler-ci-cli mcp` starts a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio, so AI clients can query and operate Jenkins using your existing Butler configurations (`~/.butler-ci-cli/configs`) or the `JENKINS_*` environment variables.

### Connect a client

```bash
# Claude Code
claude mcp add butler -- npx -y butler-ci-cli mcp
```

```jsonc
// Claude Desktop: claude_desktop_config.json
{
  "mcpServers": {
    "butler": { "command": "npx", "args": ["-y", "butler-ci-cli", "mcp"] }
  }
}
```

```jsonc
// OpenCode: opencode.json
{
  "mcp": {
    "butler": { "type": "local", "command": ["npx", "-y", "butler-ci-cli", "mcp"] }
  }
}
```

If you installed it globally, replace `npx -y butler-ci-cli` with `butler-ci-cli`. Add `--read-only` for a read-only server, or `--enable-create-config` to enable `create_config`.

### Instructions for the model

On connect, the server sends usage instructions to the client (the MCP `instructions` field), which clients add to the model's context: how to pick the Jenkins environment, how to find job paths, how to diagnose a failed build, which tools have real effects and how to read the ones marked as disabled. The text adapts to `--read-only` and `--enable-create-config`. Everything the model sees from this server (instructions, tool descriptions, errors) is in English, which keeps the context smaller; the model still answers in the user's language.

### Telling the model about your Jenkins

The model cannot know which job deploys what, which parameters you always use or what your flow looks like. Write it down and the server adds it to the instructions, under "Installation context". There are three sources, combined in this order:

1. `~/.butler-ci-cli/context.md`: loaded automatically if it exists.
2. `--context-file <path>`: any other file.
3. `--context "<text>"`: inline text.

```markdown
<!-- ~/.butler-ci-cli/context.md -->
Production deploys: run job "platform/deploy" with ENV=prod, after "platform/build" succeeded.
Release flow: build -> deploy to pre -> smoke tests -> deploy to prod.
Never trigger anything on the "prod" environment without asking me first.
When environment "staging" is active, use the jobs under "sandbox/".
```

```bash
claude mcp add butler -- butler-ci-cli mcp --context-file ~/jenkins-context.md
```

The context is read when the server starts, so restart it (or reconnect the client) after editing. Instructions are sent once per connection, so if you switch environments mid-session, the text can't change: mention the environment by name, as in the last line above, and the model will check which one is active. It goes into the model's context on every conversation, so it is capped at 8,000 characters (longer text is truncated and a warning is printed to stderr). Keep it short and don't put secrets in it.

### Tools

Tools that are turned off by a flag stay listed, marked as disabled. Calling one returns an error explaining which option enables it, so models don't conclude the capability doesn't exist and try other tools instead.

| Tool | Description |
|------|-------------|
| `get_config` | Active environment and all saved ones (never includes tokens) |
| `use_config` | Switch the active Jenkins environment |
| `update_config` / `delete_config` | Modify or remove environments (disabled with `--read-only`) |
| `create_config` | Create an environment. Disabled by default: enable it with `--enable-create-config` (also disabled with `--read-only`) |
| `search_jobs` / `list_jobs` | Find jobs, list jobs and folders |
| `get_job_info` / `get_job_params` | Job details and accepted parameters |
| `get_last_build` / `list_builds` | Build status, filtering and pagination |
| `get_build_logs` | Last N lines of a build log (`build` accepts a number or `latest`) |
| `follow_build_logs` | Incremental log reading for running builds |
| `get_build_steps` | Pipeline stages and steps |
| `download_build_logs` | Save a log to `~/.butler-ci-cli/logs` (disabled with `--read-only`) |
| `trigger_build` | Start a build with parameters (disabled with `--read-only`) |
| `abort_build` | Abort a running build; the build number is required (disabled with `--read-only`) |

## 🗂️ Project Structure

```
butler-ci-cli/
├── src/
│   ├── commands/           # CLI commands
│   │   ├── config/         # Configuration commands
│   │   ├── fetchJobs.ts    # fetch-jobs command
│   │   ├── jobInfo.ts      # job-info command
│   │   ├── build.ts        # build command
│   │   ├── batch.ts        # jobs batch command
│   │   ├── stages.ts       # jobs stages command
│   │   ├── listBuilds.ts   # list-builds command
│   │   └── logs.ts         # logs command
│   ├── mcp/                # MCP server (butler-ci-cli mcp)
│   ├── utils/              # Utilities
│   │   ├── batchRunner.ts  # Concurrency-limited batch engine and manifest
│   │   ├── config.ts       # Configuration management
│   │   ├── jenkinsClient.ts # HTTP client for Jenkins
│   │   └── storage.ts      # Local storage management
│   └── index.ts            # Main entry point
├── tests/                  # Test files
├── docs/                   # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Development

### Available Scripts

```bash
pnpm run dev      # Run in development mode
pnpm run build    # Build for production
pnpm run start    # Run built version
pnpm run test     # Run tests
pnpm run test:coverage  # Run tests with coverage
```

### Adding New Commands

1. Create a new file in `src/commands/`
2. Implement the command function
3. Register the command in `src/index.ts`

## 📦 Dependencies

### Main
- **commander**: CLI framework
- **axios**: HTTP client for API calls
- **chalk**: Terminal colors
- **inquirer**: Interactive prompts
- **pino**: Logging
- **@modelcontextprotocol/sdk**: MCP server
- **zod**: Tool input validation

### Development
- **typescript**: Programming language
- **vitest**: Testing framework
- **ts-node**: Direct TypeScript execution

## 🤝 Contributing

Want to contribute? Great! Check out our [Contributing Guide](CONTRIBUTING.md) for more details.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'feat: add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📚 Documentation

- **[README](README.md)** - This guide
- **[FAQ](docs/FAQ.md)** - Frequently asked questions
- **[Batch runs](docs/BATCH.md)** - Launch several jobs with limited concurrency (`jobs batch`)
- **[Examples Guide](docs/EXAMPLES.md)** - Practical examples
- **[Architecture](docs/ARCHITECTURE.md)** - Technical documentation
- **[Jenkins API](docs/JENKINS_API.md)** - API guide
- **[Contributing](CONTRIBUTING.md)** - Contribution guide
- **[Changelog](CHANGELOG.md)** - Change history
- **[Publishing](docs/PUBLISHING.md)** - Publishing guide
- **[Automated Releases](docs/AUTOMATED_RELEASES.md)** - Automated release workflow guide

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🐛 Bug Reports

If you find a bug or have suggestions, please:

1. Check if a similar issue exists in [GitHub Issues](https://github.com/usarral/butler-ci-cli/issues)
2. Check the [FAQ](docs/FAQ.md)
3. Create a new issue with:
   - Problem description
   - Steps to reproduce
   - Butler CI CLI version (`butler-ci-cli --version`)
   - Node.js version (`node --version`)
   - Operating system
   - Error logs (if applicable)

## 📧 Contact

**Author:** usarral  
**Repository:** [https://github.com/usarral/butler-ci-cli](https://github.com/usarral/butler-ci-cli)
