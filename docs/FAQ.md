# Frequently Asked Questions (FAQ)

Answers to the most common questions about Butler CI CLI.

## 📋 Table of Contents

- [Installation and Configuration](#installation-and-configuration)
- [General Usage](#general-usage)
- [Configurations](#configurations)
- [Commands](#commands)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## 🔧 Installation and Configuration

### How do I install Butler CI CLI?

There are two ways:

**From npm (recommended when published):**
```bash
npm install -g butler-ci-cli
```

**From source:**
```bash
git clone https://github.com/usarral/butler-ci-cli.git
cd butler-ci-cli
pnpm install
pnpm build
pnpm install -g .
```

### What version of Node.js do I need?

Butler CI CLI requires Node.js version 16 or higher. To check your version:
```bash
node --version
```

### Where are configurations stored?

Configurations are stored in `~/.butler-ci-cli/`:
- Configuration files: `~/.butler-ci-cli/configs/`
- Active configuration: `~/.butler-ci-cli/current-config.txt`
- Downloaded logs: `~/.butler-ci-cli/logs/` (by default)

### How do I get my Jenkins API token?

1. Access Jenkins
2. Click on your username (top right corner)
3. Click on "Configure"
4. In the "API Token" section, click "Add new Token"
5. Give it a descriptive name
6. Click "Generate"
7. **Copy the token immediately** (it won't be shown again)

## 💻 General Usage

### Can I use Butler CLI with multiple Jenkins servers?

Yes! That's the purpose of the configuration system:

```bash
# Create configuration for development
butler-ci-cli config create
# name: dev, url: https://jenkins-dev.com

# Create configuration for production
butler-ci-cli config create
# name: prod, url: https://jenkins-prod.com

# Switch between them
butler-ci-cli config use dev
butler-ci-cli config use prod
```

### How do I update Butler CLI?

**If installed from npm:**
```bash
npm update -g butler-ci-cli
```

**If installed from source:**
```bash
cd butler-ci-cli
git pull
pnpm install
pnpm build
pnpm install -g .
```

### Can I use environment variables instead of configurations?

Yes, for compatibility Butler CLI still supports environment variables:

```bash
export JENKINS_URL="https://your-jenkins-server.com"
export JENKINS_USER="your-username"
export JENKINS_TOKEN="your-api-token"
```

If there's no active configuration, these variables will be used automatically.

## ⚙️ Configurations

### How do I see which configuration is active?

```bash
butler-ci-cli config current
```

### Can I edit an existing configuration?

Currently you can edit preferences (editor, log viewer, directory):

```bash
butler-ci-cli config edit [name]
```

To change URL, user, or token, you need to create a new configuration or manually edit the JSON file in `~/.butler-ci-cli/configs/`.

### What happens if I delete the active configuration?

If you delete the active configuration, Butler CLI will:
1. Try to use environment variables
2. If there are no environment variables, ask you to create or select a configuration

### How do I change the default editor?

```bash
butler-ci-cli config edit
# Select your preferred editor (code, vim, nano, etc.)
```

### Where are logs downloaded by default?

By default to `~/.butler-ci-cli/logs/`, but you can change it:

```bash
butler-ci-cli config edit
# Specify your preferred directory
```

## 🎮 Commands

### How do I list all available jobs?

```bash
# List only jobs
butler-ci-cli list-jobs

# Include folders
butler-ci-cli list-jobs --folders

# Limit depth
butler-ci-cli list-jobs --max-level 2
```

### How do I search for a specific job?

```bash
butler-ci-cli search-jobs <term>

# Example
butler-ci-cli search-jobs user
butler-ci-cli search-jobs deploy
```

### How do I work with jobs in folders?

Use the full path separated by `/`:

```bash
# Job in folder
butler-ci-cli job-info frontend/build-app

# Job in subfolder
butler-ci-cli job-info backend/microservices/user-service

# Last build
butler-ci-cli last-build backend/api/deploy
```

### How do I execute a build with parameters?

**Interactive mode (recommended):**
```bash
butler-ci-cli build my-job
# It will ask for the value of each parameter
```

**With CLI parameters:**
```bash
butler-ci-cli build my-job --params "ENV=prod,VERSION=1.0.0,SKIP_TESTS=false"
```

### How do I view logs from the latest build?

```bash
# View in terminal
butler-ci-cli logs my-job latest

# Download to file
butler-ci-cli logs my-job latest --download

# Open in editor
butler-ci-cli logs my-job latest --editor
```

### Can I download logs to a specific location?

Yes, use the `--output` option:

```bash
butler-ci-cli logs my-job 42 --download --output /tmp/build.log
```

## 🔧 Troubleshooting

### Error: "Invalid credentials"

**Cause:** Incorrect or expired API token.

**Solution:**
1. Verify the token is correct
2. Generate a new token in Jenkins
3. Update the configuration:
   ```bash
   butler-ci-cli config delete name
   butler-ci-cli config create
   ```

### Error: "Could not connect to Jenkins"

**Possible causes:**
1. Incorrect URL
2. Jenkins not accessible
3. Network/firewall issues

**Solutions:**
1. Verify the URL:
   ```bash
   butler-ci-cli config current
   ```
2. Try accessing the URL in a browser
3. Verify you have network connection

### Icons and accents look like garbage in PowerShell (`≡ƒôè`, `configuraci├│n`)

**Cause:** the CLI used to write its log output straight to file descriptor 1,
which on Windows bypasses the console's Unicode API. The terminal then decoded
those UTF-8 bytes with its active code page (850/437 on Spanish Windows). No
font — not even a Nerd Font — can fix that, because the characters themselves
are wrong before any glyph is looked up.

**Solution:** update to a version that includes the fix; output now goes
through `process.stdout`, which uses the native `WriteConsoleW` path.

```bash
npm update -g butler-ci-cli
```

### Icons render but the columns are misaligned

**Cause:** the classic Windows console (`conhost`) draws emoji with
inconsistent widths.

**Solution:** the CLI already falls back to plain ASCII icons there. You can
force either set:

```bash
BUTLER_ICONS=ascii butler-ci-cli list-jobs   # plain ASCII
BUTLER_ICONS=emoji butler-ci-cli list-jobs   # emoji
```

Or use Windows Terminal, which renders emoji correctly.

### Error: "Job not found"

**Causes:**
1. Job name is incorrect
2. Job is in a folder and you didn't include the full path

**Solutions:**
1. List all jobs:
   ```bash
   butler-ci-cli fetch-jobs
   butler-ci-cli list-jobs
   ```
2. Search for the job:
   ```bash
   butler-ci-cli search-jobs <name>
   ```
3. Use the full path if it's in a folder:
   ```bash
   butler-ci-cli job-info folder/subfolder/job
   ```

### Error: "No permissions to access this resource"

**Cause:** Your user doesn't have sufficient permissions in Jenkins.

**Solution:**
Contact the Jenkins administrator to get the necessary permissions.

### Commands are very slow

**Causes:**
1. Jenkins is overloaded
2. Many jobs on the server
3. Slow connection

**Solutions:**
1. Use `fetch-jobs` to save the list locally
2. Limit depth with `--max-level`
3. Check your internet connection

### Error: "ENOENT: no such file or directory"

**Cause:** Issues with configuration directories.

**Solution:**
```bash
# Recreate configuration directory
mkdir -p ~/.butler-ci-cli/configs
mkdir -p ~/.butler-ci-cli/logs

# Create new configuration
butler-ci-cli config create
```

## 🔒 Security

### Is it safe to store my token in a file?

Tokens are stored in plain text in `~/.butler-ci-cli/configs/`. It's recommended to:

1. Set restrictive permissions:
   ```bash
   chmod 700 ~/.butler-ci-cli
   chmod 600 ~/.butler-ci-cli/configs/*
   ```

2. Don't share your home directory

3. Revoke tokens when they're no longer needed

### Can I use Butler CLI in automated scripts?

Yes, you can use environment variables for automation:

```bash
#!/bin/bash
export JENKINS_URL="https://jenkins.com"
export JENKINS_USER="ci-user"
export JENKINS_TOKEN="$CI_TOKEN"

butler-ci-cli fetch-jobs
butler-ci-cli build my-job --params "ENV=prod"
```

### What permissions do I need in Jenkins?

Minimum recommended permissions:
- **Read**: To view jobs and builds
- **Build**: To execute builds
- **Configure**: Only if you need to modify jobs (uncommon)

### Can I use Butler CLI with Jenkins behind a VPN?

Yes, as long as you can access Jenkins from your terminal and have valid credentials, Butler CLI will work through a VPN connection.

## 📚 Other

### How do I contribute to the project?

Read the [Contributing Guide](CONTRIBUTING.md) for more information.

### Where do I report bugs or suggest features?

Open an issue on GitHub: https://github.com/usarral/butler-ci-cli/issues

### Is there a version with a graphical interface?

Not currently, but it's in the plans for future versions.

### Does Butler CLI support other CI/CD systems besides Jenkins?

Currently only Jenkins. Support for other platforms is under consideration for future versions.

### Can I use Butler CLI on Windows?

Yes, Butler CLI is cross-platform and works on:
- Linux
- macOS
- Windows (with PowerShell or Git Bash)

### How do I uninstall Butler CLI?

```bash
# If installed with npm
npm uninstall -g butler-ci-cli

# Remove configurations (optional)
rm -rf ~/.butler-ci-cli
```

### Does Butler CLI have telemetry or analytics?

No. Butler CLI does not collect any telemetry or usage data.

---

Didn't find your question? Open an issue with the `question` label on GitHub.
