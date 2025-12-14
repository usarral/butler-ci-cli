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
- 📄 View and download build logs
- 🔄 Stream logs in real-time with configurable refresh intervals
- ✏️ Open logs in configurable editors
- ⚙️ Customizable preferences system (editor, log viewer, directory)
- 🔍 View workflow steps and stages of job executions

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

## 🗂️ Project Structure

```
butler-ci-cli/
├── src/
│   ├── commands/           # CLI commands
│   │   ├── config/         # Configuration commands
│   │   ├── fetchJobs.ts    # fetch-jobs command
│   │   ├── jobInfo.ts      # job-info command
│   │   ├── build.ts        # build command
│   │   ├── listBuilds.ts   # list-builds command
│   │   └── logs.ts         # logs command
│   ├── utils/              # Utilities
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
